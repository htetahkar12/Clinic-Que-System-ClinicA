using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace ClinicReceptionDoctorDesktop
{
    public class MainForm : Form
    {
        private readonly string serverUrl = "https://clinic-que-system-clinic-a.vercel.app";
        private WebBrowser browser;

        public MainForm()
        {
            this.Text = "Clinic Reception & Doctor System (Windows Desktop)";
            this.Width = 1320;
            this.Height = 840;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(15, 23, 42);
            this.Icon = CreateMedicalAppIcon();

            Panel topBar = new Panel
            {
                Dock = DockStyle.Top,
                Height = 60,
                BackColor = Color.FromArgb(15, 23, 42),
                Padding = new Padding(16, 10, 16, 10)
            };

            Label titleLbl = new Label
            {
                Text = "🏥 Reception နှင့် ဆရာဝန်အခန်း ထိန်းချုပ်စနစ် (Windows Desktop)",
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 12.5f, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(16, 17)
            };
            topBar.Controls.Add(titleLbl);

            Button btnReception = CreateModeButton("Reception ကောင်တာ ဖွင့်မည်", 520, Color.FromArgb(11, 94, 215));
            btnReception.Click += (s, e) => OpenRoute("/reception");
            topBar.Controls.Add(btnReception);

            Button btnDoctor = CreateModeButton("ဆရာဝန်အခန်း ဖွင့်မည်", 770, Color.FromArgb(21, 128, 61));
            btnDoctor.Click += (s, e) => OpenRoute("/doctor");
            topBar.Controls.Add(btnDoctor);

            Panel bodyPanel = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.FromArgb(241, 245, 249),
                Padding = new Padding(24)
            };

            Panel card = new Panel
            {
                Dock = DockStyle.Top,
                Height = 200,
                BackColor = Color.White,
                Padding = new Padding(24)
            };

            Label infoTitle = new Label
            {
                Text = "Reception ကောင်တာနှင့် ဆရာဝန်အခန်း ရွေးချယ်ဖွင့်လှစ်ရန်",
                Font = new Font("Segoe UI", 15, FontStyle.Bold),
                ForeColor = Color.FromArgb(15, 23, 42),
                AutoSize = true,
                Location = new Point(24, 22)
            };
            card.Controls.Add(infoTitle);

            Label subTitle = new Label
            {
                Text = "အောက်ပါ ခလုတ်များကို နှိပ်၍ Reception စီမံခန့်ခွဲမှု သို့မဟုတ် ဆရာဝန်အခန်း အလှည့်ခေါ်စနစ်သို့ တိုက်ရိုက် ဝင်ရောက်နိုင်ပါသည်။",
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                ForeColor = Color.FromArgb(71, 85, 105),
                AutoSize = true,
                Location = new Point(24, 58)
            };
            card.Controls.Add(subTitle);

            Button bigReceptionBtn = new Button
            {
                Text = "၁။ Reception ကောင်တာ စနစ် ဖွင့်မည်",
                Font = new Font("Segoe UI", 12, FontStyle.Bold),
                BackColor = Color.FromArgb(11, 94, 215),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Size = new Size(420, 56),
                Location = new Point(24, 102)
            };
            bigReceptionBtn.Click += (s, e) => OpenRoute("/reception");
            card.Controls.Add(bigReceptionBtn);

            Button bigDoctorBtn = new Button
            {
                Text = "၂။ ဆရာဝန်အခန်း စနစ် ဖွင့်မည်",
                Font = new Font("Segoe UI", 12, FontStyle.Bold),
                BackColor = Color.FromArgb(21, 128, 61),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Size = new Size(420, 56),
                Location = new Point(464, 102)
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

        private static Icon CreateMedicalAppIcon()
        {
            Bitmap bmp = new Bitmap(64, 64);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                using (Brush bg = new SolidBrush(Color.FromArgb(11, 94, 215)))
                {
                    g.FillEllipse(bg, 2, 2, 60, 60);
                }
                using (Brush cross = new SolidBrush(Color.White))
                {
                    g.FillRectangle(cross, 26, 14, 12, 36);
                    g.FillRectangle(cross, 14, 26, 36, 12);
                }
            }
            return Icon.FromHandle(bmp.GetHicon());
        }

        private Button CreateModeButton(string text, int x, Color bg)
        {
            return new Button
            {
                Text = text,
                Location = new Point(x, 10),
                Size = new Size(235, 40),
                BackColor = bg,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold)
            };
        }

        private void OpenRoute(string route)
        {
            if (route.Contains("$uper@dmin")) return;

            string fullUrl = serverUrl.TrimEnd('/') + route;
            try
            {
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
