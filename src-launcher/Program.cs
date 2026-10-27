using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace BanquetCashierNativeApp
{
    public class MainForm : Form
    {
        private const int TARGET_PORT = 8089;
        private const string APP_TITLE = "礼金收聘系统 · 账房云枢";
        private WebView2 webView;
        private Process nodeProcess;
        private bool isClosingHandled = false;

        public MainForm()
        {
            this.Text = APP_TITLE;
            this.Size = new Size(1420, 920);
            this.MinimumSize = new Size(1100, 720);
            this.StartPosition = FormStartPosition.CenterScreen;

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string icoPath = Path.Combine(appDir, "assets", "app.ico");
            if (File.Exists(icoPath))
            {
                try
                {
                    this.Icon = new Icon(icoPath);
                }
                catch {}
            }

            // 初始化 WebView2 控件并撑满窗体
            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            this.Controls.Add(webView);

            this.Load += MainForm_Load;
            this.FormClosing += MainForm_FormClosing;
        }

        private async void MainForm_Load(object sender, EventArgs e)
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string serverUrl = "http://localhost:" + TARGET_PORT;

            // 1. 启动或连接后台服务
            EnsureBackendServiceRunning(appDir);

            // 2. 初始化独立沙盒 WebView2 现代 Chromium 渲染内核
            try
            {
                string dataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "BanquetCashier",
                    "WebView2Data"
                );
                Directory.CreateDirectory(dataFolder);

                var env = await CoreWebView2Environment.CreateAsync(null, dataFolder);
                await webView.EnsureCoreWebView2Async(env);

                // 优化界面沉浸感，禁用多余状态栏，允许快捷键缩放
                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                webView.CoreWebView2.Settings.IsZoomControlEnabled = true;

                // 监听网页端的主动退出请求 (window.close)
                webView.CoreWebView2.WindowCloseRequested += (s, args) =>
                {
                    this.Close();
                };

                // 导航至本地服务端首页
                webView.CoreWebView2.Navigate(serverUrl);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "WebView2 渲染组件初始化异常: " + ex.Message + "\n系统将尝试调用默认浏览器打开系统。",
                    APP_TITLE,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                try { Process.Start(serverUrl); } catch {}
            }
        }

        private void EnsureBackendServiceRunning(string appDir)
        {
            if (IsPortListening("127.0.0.1", TARGET_PORT, 150))
            {
                return;
            }

            string bundledNode = Path.Combine(appDir, "runtime", "node.exe");
            string nodeExecutable = File.Exists(bundledNode) ? bundledNode : "node";
            string serverScript = Path.Combine(appDir, "server.js");

            if (!File.Exists(serverScript))
            {
                MessageBox.Show("未在程序目录下找到 server.js 核心脚本，请确保文件完整。", APP_TITLE, MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = nodeExecutable;
            psi.Arguments = "\"" + serverScript + "\"";
            psi.WorkingDirectory = appDir;
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.CreateNoWindow = true;
            psi.UseShellExecute = false;

            try
            {
                nodeProcess = Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("启动后台服务失败: " + ex.Message, APP_TITLE, MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // 快速轮询端口 (每 50ms 一次，最长等待 8 秒)
            for (int i = 0; i < 160; i++)
            {
                Thread.Sleep(50);
                if (IsPortListening("127.0.0.1", TARGET_PORT, 100))
                {
                    return;
                }
            }
        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (isClosingHandled) return;
            isClosingHandled = true;

            // 窗口关闭时，向服务端发送平稳停机指令，落盘未保存账本并释放内存资源
            try
            {
                var req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + TARGET_PORT + "/api/system/shutdown");
                req.Method = "POST";
                req.Timeout = 1500;
                using (var res = req.GetResponse()) {}
            }
            catch {}

            // 若后台进程仍存活，确保平稳退出
            if (nodeProcess != null && !nodeProcess.HasExited)
            {
                try
                {
                    nodeProcess.Kill();
                }
                catch {}
            }
        }

        private static bool IsPortListening(string host, int port, int timeoutMs)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(timeoutMs);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }
    }

    public static class Program
    {
        private const int TARGET_PORT = 8089;

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern bool SetDllDirectory(string lpPathName);

        private static void SetupAssemblyResolution()
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string libDesktop = Path.Combine(appDir, "lib-desktop");

            try
            {
                if (Directory.Exists(libDesktop))
                {
                    SetDllDirectory(libDesktop);
                }
            }
            catch {}

            AppDomain.CurrentDomain.AssemblyResolve += (sender, args) =>
            {
                try
                {
                    string assemblyName = new AssemblyName(args.Name).Name + ".dll";
                    string path = Path.Combine(libDesktop, assemblyName);
                    if (File.Exists(path))
                    {
                        return Assembly.LoadFrom(path);
                    }
                }
                catch {}
                return null;
            };
        }

        [STAThread]
        public static void Main(string[] args)
        {
            // 命令行参数支持快速停止后台服务
            if (args.Length > 0 && (args[0] == "--stop" || args[0] == "-stop" || args[0] == "/stop"))
            {
                try
                {
                    var req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + TARGET_PORT + "/api/system/shutdown");
                    req.Method = "POST";
                    req.Timeout = 1500;
                    using (var res = req.GetResponse()) {}
                }
                catch {}
                return;
            }

            SetupAssemblyResolution();
            RunApplication();
        }

        [MethodImpl(MethodImplOptions.NoInlining)]
        private static void RunApplication()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}
