using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace ClinicReceptionDoctorDesktop
{
    public class MainForm : Form
    {
        private string serverUrl = "https://clinic-que-system-clinic-a.vercel.app";
        private string configPath;
        private WebBrowser browser;
        private TextBox urlBox;
        private Label statusLabel;

        public MainForm()
        {
            string appData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "ClinicReceptionDoctor"
            );
            Directory.CreateDirectory(appData);
            configPath = Path.Combine(appData, "server_url.txt");
            if (File.Exists(configPath))
            {
                string saved = File.ReadAllText(configPath).Trim();
                if (!string.IsNullOrEmpty(saved)) serverUrl = saved.TrimEnd('/');
            }

            this.Text = "Clinic Reception & Doctor System (Windows Desktop)";
            this.Width = 1360;
            this.Height = 860;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(15, 23, 42);

            Panel topBar = new Panel
            {
                Dock = DockStyle.Top,
                Height = 64,
                BackColor = Color.FromArgb(15, 23, 42),
                Padding = new Padding(14, 10, 14, 10)
            };

            Label titleLbl = new Label
            {
                Text = "🏥 Reception + Doctor Desktop Console",
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 13, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(14, 18)
            };
            topBar.Controls.Add(titleLbl);

            Button btnReception = CreateModeButton("Reception ကောင်တာ (/reception)", 360, Color.FromArgb(11, 94, 215));
            btnReception.Click += (s, e) => OpenRoute("/reception");
            topBar.Controls.Add(btnReception);

            Button btnDoctor = CreateModeButton("ဆရာဝန်အခန်း (/doctor)", 595, Color.FromArgb(21, 128, 61));
            btnDoctor.Click += (s, e) => OpenRoute("/doctor");
            topBar.Controls.Add(btnDoctor);

            Button btnTv = CreateModeButton("TV ဖန်သားပြင် (/tv)", 795, Color.FromArgb(79, 70, 229));
            btnTv.Click += (s, e) => OpenRoute("/tv");
            topBar.Controls.Add(btnTv);

            urlBox = new TextBox
            {
                Text = serverUrl,
                Width = 240,
                Location = new Point(980, 19),
                Font = new Font("Segoe UI", 9, FontStyle.Regular)
            };
            topBar.Controls.Add(urlBox);

            Button btnSaveUrl = CreateModeButton("Server သိမ်းမည်", 1228, Color.FromArgb(51, 65, 85));
            btnSaveUrl.Width = 105;
            btnSaveUrl.Click += (s, e) =>
            {
                serverUrl = urlBox.Text.Trim().TrimEnd('/');
                File.WriteAllText(configPath, serverUrl);
                statusLabel.Text = "ချိတ်ဆက်ထားသော Server: " + serverUrl;
                OpenRoute("/reception");
            };
            topBar.Controls.Add(btnSaveUrl);

            Panel bodyPanel = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.FromArgb(241, 245, 249),
                Padding = new Padding(24)
            };

            Panel card = new Panel
            {
                Dock = DockStyle.Top,
                Height = 220,
                BackColor = Color.White,
                Padding = new Padding(24)
            };

            Label infoTitle = new Label
            {
                Text = "Reception နှင့် ဆရာဝန်အခန်း ထိန်းချုပ်စနစ် (Windows Edition)",
                Font = new Font("Segoe UI", 16, FontStyle.Bold),
                ForeColor = Color.FromArgb(15, 23, 42),
                AutoSize = true,
                Location = new Point(24, 20)
            };
            card.Controls.Add(infoTitle);

            statusLabel = new Label
            {
                Text = "ချိတ်ဆက်ထားသော Server: " + serverUrl + "  |  မှတ်ချက် - SuperAdmin (/$uper@dmin) ကို Web မှသာ ထိန်းချုပ်နိုင်ပါသည်။",
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                ForeColor = Color.FromArgb(21, 128, 61),
                AutoSize = true,
                Location = new Point(24, 58)
            };
            card.Controls.Add(statusLabel);

            Button bigReceptionBtn = new Button
            {
                Text = "၁။ Reception ကောင်တာ စီမံခန့်ခွဲမှု ဖွင့်မည် (/reception)",
                Font = new Font("Segoe UI", 12, FontStyle.Bold),
                BackColor = Color.FromArgb(11, 94, 215),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Size = new Size(440, 56),
                Location = new Point(24, 105)
            };
            bigReceptionBtn.Click += (s, e) => OpenRoute("/reception");
            card.Controls.Add(bigReceptionBtn);

            Button bigDoctorBtn = new Button
            {
                Text = "၂။ ဆရာဝန်အခန်း ထိန်းချုပ်စနစ် ဖွင့်မည် (/doctor)",
                Font = new Font("Segoe UI", 12, FontStyle.Bold),
                BackColor = Color.FromArgb(21, 128, 61),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Size = new Size(440, 56),
                Location = new Point(484, 105)
            };
            bigDoctorBtn.Click += (s, e) => OpenRoute("/doctor");
            card.Controls.Add(bigDoctorBtn);

            browser = new WebBrowser
            {
                Dock = DockStyle.Fill,
                ScriptErrorsSuppressed = true
            };
            browser.Navigating += (s, e) =>
            {
                string target = e.Url != null ? e.Url.ToString() : "";
                if (target.Contains("$uper@dmin") || target.Contains("super-admin"))
                {
                    e.Cancel = true;
                    MessageBox.Show(
                        "SuperAdmin စနစ်ကို ပိုင်ရှင်မှ Web Browser တွင်သာ တိုက်ရိုက် ဝင်ရောက်ထိန်းချုပ်နိုင်ပါသည်။",
                        "SuperAdmin Web Only",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                }
            };

            bodyPanel.Controls.Add(browser);
            bodyPanel.Controls.Add(card);

            this.Controls.Add(bodyPanel);
            this.Controls.Add(topBar);
        }

        private Button CreateModeButton(string text, int x, Color bg)
        {
            return new Button
            {
                Text = text,
                Location = new Point(x, 12),
                Size = new Size(225, 40),
                BackColor = bg,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold)
            };
        }

        private void OpenRoute(string route)
        {
            // Block SuperAdmin inside Reception+Doctor Windows App
            if (route.Contains("$uper@dmin")) return;

            string fullUrl = serverUrl.TrimEnd('/') + route;
            try
            {
                // Launch in Edge/Chrome App Mode (--app=...) for full modern Chromium PWA support
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "msedge.exe",
                    Arguments = "--app=\"" + fullUrl + "\"",
                    UseShellExecute = true
                };
                Process.Start(psi);
            }
            catch
            {
                try
                {
                    Process.Start(new ProcessStartInfo(fullUrl) { UseShellExecute = true });
                }
                catch { }
            }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}
