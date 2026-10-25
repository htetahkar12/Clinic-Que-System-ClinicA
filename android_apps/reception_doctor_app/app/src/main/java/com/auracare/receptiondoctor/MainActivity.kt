package com.auracare.receptiondoctor

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Gravity
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.Timer
import java.util.TimerTask

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private val FILE_CHOOSER_REQ_CODE = 1002
    private val CHANNEL_ID = "clinic_staff_reception_alerts_v3"

    private var serverUrl = "https://clinic-que-system-clinic-a.vercel.app"
    private var currentRoute = "/reception"
    private var pollTimer: Timer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val seenNotifIds = HashSet<String>()
    private var isFirstSync = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences("clinic_staff_prefs", Context.MODE_PRIVATE)
        serverUrl = prefs.getString("server_url", serverUrl) ?: serverUrl
        currentRoute = prefs.getString("last_route", "/reception") ?: "/reception"

        setupNotificationChannel()
        requestRuntimePermissions()
        acquireKeepAliveWakeLock()

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#0F172A"))
        }

        // Top Mode Bar: Reception vs Doctor Room vs TV Display + Server Settings (No SuperAdmin!)
        val topBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(16, 14, 16, 14)
            setBackgroundColor(Color.parseColor("#0F172A"))
        }

        val btnReception = Button(this).apply {
            text = "Reception ကောင်တာ"
            textSize = 12f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#0B5ED7"))
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.3f).apply {
                marginEnd = 8
            }
            setOnClickListener { switchRoute("/reception") }
        }

        val btnDoctor = Button(this).apply {
            text = "ဆရာဝန်အခန်း"
            textSize = 12f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#15803D"))
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.1f).apply {
                marginEnd = 8
            }
            setOnClickListener { switchRoute("/doctor") }
        }

        val btnTv = Button(this).apply {
            text = "TV"
            textSize = 12f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#4F46E5"))
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 0.6f).apply {
                marginEnd = 8
            }
            setOnClickListener { switchRoute("/tv") }
        }

        val btnServer = Button(this).apply {
            text = "Server"
            textSize = 12f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#334155"))
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 0.7f)
            setOnClickListener { showServerConfigDialog() }
        }

        topBar.addView(btnReception)
        topBar.addView(btnDoctor)
        topBar.addView(btnTv)
        topBar.addView(btnServer)

        webView = WebView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        }

        configureWebView()

        root.addView(topBar)
        root.addView(webView)
        setContentView(root)

        webView.loadUrl("$serverUrl$currentRoute")
        startReceptionBookingAlertPolling()
    }

    private fun switchRoute(route: String) {
        currentRoute = route
        getSharedPreferences("clinic_staff_prefs", Context.MODE_PRIVATE)
            .edit()
            .putString("last_route", currentRoute)
            .apply()
        webView.loadUrl("$serverUrl$currentRoute")
    }

    private fun configureWebView() {
        val ws: WebSettings = webView.settings
        ws.javaScriptEnabled = true
        ws.domStorageEnabled = true
        ws.databaseEnabled = true
        ws.allowFileAccess = true
        ws.allowContentAccess = true
        ws.mediaPlaybackRequiresUserGesture = false
        ws.cacheMode = WebSettings.LOAD_DEFAULT
        ws.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val target = request?.url?.toString() ?: return false
                // Strictly block SuperAdmin inside Reception + Doctor App!
                if (target.contains("\$uper@dmin") || target.contains("super-admin")) {
                    Toast.makeText(
                        this@MainActivity,
                        "SuperAdmin စနစ်ကို ပိုင်ရှင်မှ Web တွင်သာ သီးသန့် ထိန်းချုပ်နိုင်ပါသည်။",
                        Toast.LENGTH_LONG
                    ).show()
                    return true
                }
                return false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                // Allow WebView camera access for live QR Code scanning at Reception!
                request?.grant(request.resources)
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback
                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                }
                startActivityForResult(
                    Intent.createChooser(intent, "ပုံရွေးချယ်ရန်"),
                    FILE_CHOOSER_REQ_CODE
                )
                return true
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQ_CODE) {
            val result = if (resultCode == RESULT_OK && data?.data != null) {
                arrayOf(data.data!!)
            } else {
                null
            }
            fileUploadCallback?.onReceiveValue(result)
            fileUploadCallback = null
        }
    }

    private fun showServerConfigDialog() {
        val input = EditText(this).apply {
            setText(serverUrl)
            setPadding(36, 28, 36, 28)
        }
        AlertDialog.Builder(this)
            .setTitle("ဆေးခန်း Server လိပ်စာ ပြင်ဆင်ရန်")
            .setView(input)
            .setPositiveButton("သိမ်းမည်") { _, _ ->
                val cleaned = input.text.toString().trim().trimEnd('/')
                if (cleaned.isNotEmpty()) {
                    serverUrl = cleaned
                    getSharedPreferences("clinic_staff_prefs", Context.MODE_PRIVATE)
                        .edit()
                        .putString("server_url", serverUrl)
                        .apply()
                    webView.loadUrl("$serverUrl$currentRoute")
                }
            }
            .setNegativeButton("ပိတ်မည်", null)
            .show()
    }

    private fun setupNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val attrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            val channel = NotificationChannel(
                CHANNEL_ID,
                "Reception ဘိုကင်သစ်နှင့် ပယ်ဖျက်ခွင့် သတိပေးချက်များ",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "လူနာမှ ဘိုကင်တင်ချိန် သို့မဟုတ် ပယ်ဖျက်ခွင့်တောင်းချိန် အသံမြည် သတိပေးချက်"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 300, 150, 400)
                setSound(soundUri, attrs)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun requestRuntimePermissions() {
        val needed = mutableListOf<String>()
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.CAMERA)
        }
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            needed.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        if (needed.isNotEmpty()) {
            requestPermissions(needed.toTypedArray(), 2002)
        }
    }

    private fun acquireKeepAliveWakeLock() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "ClinicReceptionDoctorApp::StaffAlertLock"
            )
            wakeLock?.acquire(8 * 60 * 60 * 1000L)
        } catch (_: Exception) {
        }
    }

    private fun startReceptionBookingAlertPolling() {
        pollTimer?.cancel()
        pollTimer = Timer(true)
        pollTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                try {
                    val url = URL("$serverUrl/api/state")
                    val conn = (url.openConnection() as HttpURLConnection).apply {
                        requestMethod = "GET"
                        connectTimeout = 4500
                        readTimeout = 4500
                    }
                    if (conn.responseCode == 200) {
                        val reader = BufferedReader(InputStreamReader(conn.inputStream))
                        val sb = StringBuilder()
                        var line: String?
                        while (reader.readLine().also { line = it } != null) {
                            sb.append(line)
                        }
                        reader.close()
                        val root = JSONObject(sb.toString())
                        if (root.optBoolean("hasState", false)) {
                            val state = root.optJSONObject("state")
                            val notifs = state?.optJSONArray("receptionNotifications")
                            if (notifs != null) {
                                for (i in 0 until notifs.length()) {
                                    val n = notifs.getJSONObject(i)
                                    val id = n.optString("id", "")
                                    if (id.isNotEmpty() && !seenNotifIds.contains(id)) {
                                        seenNotifIds.add(id)
                                        if (!isFirstSync) {
                                            val title = n.optString("title_my", "ဘိုကင်သစ် ဝင်ရောက်လာပါသည်")
                                            val body = n.optString("body_my", "")
                                            triggerStaffNotification(title, body)
                                        }
                                    }
                                }
                                isFirstSync = false
                            }
                        }
                    }
                } catch (_: Exception) {
                }
            }
        }, 2000L, 3500L)
    }

    private fun triggerStaffNotification(title: String, body: String) {
        try {
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            RingtoneManager.getRingtone(applicationContext, soundUri)?.play()

            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(
                    VibrationEffect.createWaveform(longArrayOf(0, 300, 150, 400), -1)
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(400)
            }

            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val piFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getActivity(this, 0, intent, piFlags)

            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, CHANNEL_ID)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(this)
            }

            builder.setSmallIcon(android.R.drawable.ic_menu_manage)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)

            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.notify((System.currentTimeMillis() % 100000).toInt(), builder.build())
        } catch (_: Exception) {
        }
    }

    override fun onBackPressed() {
        if (this::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        pollTimer?.cancel()
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
        } catch (_: Exception) {
        }
        super.onDestroy()
    }
}
