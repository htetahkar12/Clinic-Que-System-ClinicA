package com.auracare.patient

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
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
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
    private val FILE_CHOOSER_REQ_CODE = 1001
    private val CHANNEL_ID = "clinic_patient_live_alerts_v3"

    private var serverUrl = "https://clinic-que-system-clinic-a.vercel.app"
    private var pollTimer: Timer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val seenMessageIds = HashSet<String>()
    private var isFirstSync = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences("clinic_patient_prefs", Context.MODE_PRIVATE)
        serverUrl = prefs.getString("server_url", serverUrl) ?: serverUrl

        setupNotificationChannel()
        requestNotificationPermissionIfNeeded()
        acquireKeepAliveWakeLock()

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#0F172A"))
        }

        // Top Bar (Patient Portal Indicator + Refresh + Server Settings)
        val topBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(28, 18, 28, 18)
            setBackgroundColor(Color.parseColor("#0F172A"))
        }

        val titleView = TextView(this).apply {
            text = "🏥 လူနာ အလှည့်နှင့် ဘိုကင်စနစ် (Patient App)"
            setTextColor(Color.WHITE)
            textSize = 15f
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val btnRefresh = Button(this).apply {
            text = "Refresh"
            textSize = 12f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#1D4ED8"))
            setOnClickListener { webView.reload() }
        }

        val btnServer = Button(this).apply {
            text = "Server"
            textSize = 12f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#334155"))
            setOnClickListener { showServerConfigDialog() }
        }

        topBar.addView(titleView)
        topBar.addView(btnRefresh)
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

        webView.loadUrl(serverUrl)
        startBackgroundAlertPolling()
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
                // Strictly block Reception, Doctor, and SuperAdmin routes in Patient App!
                if (target.contains("/reception") ||
                    target.contains("/doctor") ||
                    target.contains("\$uper@dmin") ||
                    target.contains("super-admin")
                ) {
                    Toast.makeText(
                        this@MainActivity,
                        "ဤ App သည် လူနာများအတွက်သာ သီးသန့်ဖြစ်ပါသည်။",
                        Toast.LENGTH_SHORT
                    ).show()
                    return true
                }
                return false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
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
                    Intent.createChooser(intent, "ငွေလွှဲပြေစာ Screenshot ရွေးချယ်ပါ"),
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
                    getSharedPreferences("clinic_patient_prefs", Context.MODE_PRIVATE)
                        .edit()
                        .putString("server_url", serverUrl)
                        .apply()
                    webView.loadUrl(serverUrl)
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
                "ဆေးခန်း အလှည့်နှင့် သတိပေးချက်များ",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Reception မှ သတိပေးချက်များနှင့် လူနာအလှည့် နီးကပ်လာချိန် အသံမြည် သတိပေးချက်"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 350, 180, 450)
                setSound(soundUri, attrs)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 2001)
            }
        }
    }

    private fun acquireKeepAliveWakeLock() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "ClinicPatientApp::BackgroundQueueAlertLock"
            )
            wakeLock?.acquire(6 * 60 * 60 * 1000L) // Keep background alert active up to 6 hours
        } catch (_: Exception) {
        }
    }

    private fun startBackgroundAlertPolling() {
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
                            val msgs = state?.optJSONArray("messages")
                            if (msgs != null) {
                                for (i in 0 until msgs.length()) {
                                    val m = msgs.getJSONObject(i)
                                    val id = m.optString("id", "")
                                    if (id.isNotEmpty() && !seenMessageIds.contains(id)) {
                                        seenMessageIds.add(id)
                                        if (!isFirstSync) {
                                            val title = m.optString("title_my", "ဆေးခန်း သတိပေးချက်")
                                            val body = m.optString("body_my", "")
                                            triggerHighPriorityNotification(title, body)
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

    private fun triggerHighPriorityNotification(title: String, body: String) {
        try {
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            RingtoneManager.getRingtone(applicationContext, soundUri)?.play()

            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(
                    VibrationEffect.createWaveform(longArrayOf(0, 350, 180, 450), -1)
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(500)
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

            builder.setSmallIcon(android.R.drawable.ic_dialog_info)
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
