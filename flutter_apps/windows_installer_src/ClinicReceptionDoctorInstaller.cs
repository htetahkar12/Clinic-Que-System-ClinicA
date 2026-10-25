using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

namespace ClinicReceptionDoctorSetup
{
    public class SetupForm : Form
    {
        private TextBox serverInput;
        private CheckBox desktopShortcutBox;
        private CheckBox launchNowBox;
        private Label statusLbl;
        private Button installBtn;

        public SetupForm()
        {
            this.Text = "Clinic Reception + Doctor — Windows Installer Setup";
            this.Size = new Size(580, 420);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.White;

            Panel header = new Panel
            {
                Dock = DockStyle.Top,
                Height = 84,
                BackColor = Color.FromArgb(15, 23, 42)
            };

            Label title = new Label
            {
                Text = "🏥 Clinic Reception & Doctor Setup Wizard",
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 14, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(22, 18)
            };
            header.Controls.Add(title);

            Label sub = new Label
            {
                Text = "Reception နှင့် ဆရာဝန်အခန်း အသုံးပြုရန် Windows Desktop Installer (SuperAdmin သည် Web သီးသန့်ဖြစ်သည်)",
                ForeColor = Color.FromArgb(148, 163, 184),
                Font = new Font("Segoe UI", 9, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(22, 50)
            };
            header.Controls.Add(sub);

            Label serverLbl = new Label
            {
                Text = "ဆေးခန်း Server လိပ်စာ (Vercel Cloud URL သို့မဟုတ် Local Server):",
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                Location = new Point(24, 108),
                AutoSize = true
            };

            serverInput = new TextBox
            {
                Text = "https://clinic-que-system-clinic-a.vercel.app",
                Font = new Font("Segoe UI", 10),
                Location = new Point(24, 134),
                Width = 510
            };

            desktopShortcutBox = new CheckBox
            {
                Text = "Desktop ပေါ်တွင် Shortcut တင်ပေးမည် (Create Desktop Shortcut)",
                Checked = true,
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                Location = new Point(24, 180),
                AutoSize = true
            };

            launchNowBox = new CheckBox
            {
                Text = "သွင်းပြီးသည်နှင့် Reception + Doctor App ကို တန်းဖွင့်မည်",
                Checked = true,
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                Location = new Point(24, 212),
                AutoSize = true
            };

            statusLbl = new Label
            {
                Text = "Install ခလုတ်ကို နှိပ်၍ ကွန်ပျူတာထဲသို့ သွင်းနိုင်ပါသည်။",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(11, 94, 215),
                Location = new Point(24, 255),
                AutoSize = true
            };

            installBtn = new Button
            {
                Text = "Install Reception + Doctor App Now",
                Font = new Font("Segoe UI", 11, FontStyle.Bold),
                BackColor = Color.FromArgb(11, 94, 215),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Size = new Size(510, 50),
                Location = new Point(24, 292)
            };
            installBtn.Click += OnInstallClick;

            this.Controls.Add(installBtn);
            this.Controls.Add(statusLbl);
            this.Controls.Add(launchNowBox);
            this.Controls.Add(desktopShortcutBox);
            this.Controls.Add(serverInput);
            this.Controls.Add(serverLbl);
            this.Controls.Add(header);
        }

        private void OnInstallClick(object sender, EventArgs e)
        {
            try
            {
                installBtn.Enabled = false;
                string installDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "ClinicReceptionDoctor"
                );
                Directory.CreateDirectory(installDir);

                string targetExe = Path.Combine(installDir, "ClinicReceptionDoctorApp.exe");
                using (Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("ClinicReceptionDoctorApp.exe"))
                {
                    if (resStream == null)
                    {
                        throw new Exception("Embedded application payload not found.");
                    }
                    using (FileStream fs = new FileStream(targetExe, FileMode.Create, FileAccess.Write))
                    {
                        resStream.CopyTo(fs);
                    }
                }

                string cleanedUrl = serverInput.Text.Trim().TrimEnd('/');
                if (!string.IsNullOrEmpty(cleanedUrl))
                {
                    File.WriteAllText(Path.Combine(installDir, "server_url.txt"), cleanedUrl);
                }

                if (desktopShortcutBox.Checked)
                {
                    string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    CreateWindowsShortcut(
                        Path.Combine(desktopDir, "Clinic Reception & Doctor.lnk"),
                        targetExe,
                        installDir
                    );
                }

                string startMenuDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.Programs),
                    "Clinic Reception & Doctor"
                );
                Directory.CreateDirectory(startMenuDir);
                CreateWindowsShortcut(
                    Path.Combine(startMenuDir, "Clinic Reception & Doctor.lnk"),
                    targetExe,
                    installDir
                );

                statusLbl.ForeColor = Color.FromArgb(21, 128, 61);
                statusLbl.Text = "✓ သွင်းပြီးပါပြီ (Installed to: " + targetExe + ")";

                MessageBox.Show(
                    "Reception + Doctor Windows App ကို အောင်မြင်စွာ သွင်းပြီးပါပြီ!\nDesktop ပေါ်ရှိ 'Clinic Reception & Doctor' Shortcut မှ အချိန်မရွေး ဖွင့်နိုင်ပါသည်။",
                    "Installation Complete",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );

                if (launchNowBox.Checked)
                {
                    Process.Start(new ProcessStartInfo(targetExe) { UseShellExecute = true });
                }
                this.Close();
            }
            catch (Exception ex)
            {
                installBtn.Enabled = true;
                MessageBox.Show("Install Error: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void CreateWindowsShortcut(string lnkPath, string targetExe, string workDir)
        {
            try
            {
                string vbsPath = Path.Combine(Path.GetTempPath(), "create_clinic_shortcut.vbs");
                string vbs = "Set oWS = WScript.CreateObject(\"WScript.Shell\")\r\n" +
                             "Set oLink = oWS.CreateShortcut(\"" + lnkPath + "\")\r\n" +
                             "oLink.TargetPath = \"" + targetExe + "\"\r\n" +
                             "oLink.WorkingDirectory = \"" + workDir + "\"\r\n" +
                             "oLink.Description = \"Clinic Reception & Doctor Console\"\r\n" +
                             "oLink.Save\r\n";
                File.WriteAllText(vbsPath, vbs);
                Process p = Process.Start(new ProcessStartInfo("wscript.exe", "\"" + vbsPath + "\"")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                });
                if (p != null) p.WaitForExit(3000);
                File.Delete(vbsPath);
            }
            catch { }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
        }
    }
}
