; ==============================================================================
; 礼金收聘系统 · 账房云枢 - Windows 专业安装程序构建脚本 (Inno Setup 6)
; ==============================================================================

#define MyAppName "礼金收聘系统 · 账房云枢"
#define MyAppVersion "1.5.0"
#define MyAppPublisher "DPSir"
#define MyAppURL "https://github.com/dpsir/banquet-cashier"
#define MyAppExeName "BanquetCashier.exe"

[Setup]
; 基础程序信息与唯一 GUID
AppId={{C8E7F3A2-9E8B-4712-B67D-73D2951C8089}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; 安装路径与分组
DefaultDirName={autopf}\BanquetCashier
DefaultGroupName=礼金收聘系统
AllowNoIcons=yes

; 生成输出配置
OutputDir=..\dist
OutputBaseFilename=礼金收聘系统_Setup_v{#MyAppVersion}
SetupIconFile=..\assets\app.ico
UninstallDisplayIcon={app}\{#MyAppExeName}

; 压缩算法 (LZMA2 超高压缩比，大幅减少安装包体积，极速解压)
Compression=lzma2/ultra64
SolidCompression=yes
InternalCompressLevel=ultra64

; 现代向导视觉风格与权限
WizardStyle=modern
WizardSizePercent=105
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
CloseApplications=force
CloseApplicationsFilter=*.exe
RestartApplications=no
DisableProgramGroupPage=yes

[Languages]
Name: "chinesesimplified"; MessagesFile: "ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Dirs]
; 授予普通用户对数据目录的完全读写权限，确保即使非管理员登录也能自由记账
Name: "{app}\data"; Permissions: users-full
Name: "{app}\data\backups"; Permissions: users-full

[Files]
; 1. 桌面原生独立启动器与配置
Source: "..\BanquetCashier.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\BanquetCashier.exe.config"; DestDir: "{app}"; Flags: ignoreversion

; 2. 桌面互操作与渲染内核依赖 (Microsoft WebView2)
Source: "..\lib-desktop\*"; DestDir: "{app}\lib-desktop"; Flags: ignoreversion recursesubdirs createallsubdirs

; 3. 独立 Node.js 绿色便携运行时 (零环境依赖)
Source: "..\runtime\node.exe"; DestDir: "{app}\runtime"; Flags: ignoreversion

; 4. 后台服务核心引擎与配置
Source: "..\server.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion

; 5. 前端单页应用与资源 (含专属高分辨率图标与 PWA 声明)
Source: "..\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs

; 6. 核心工具库与静态图标资产
Source: "..\lib\*"; DestDir: "{app}\lib"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs

; 7. 精简生产级 Node 依赖模块 (从临时打包沙盒提取)
Source: "..\build_temp\node_modules_prod\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

; 8. 标准出厂纯净初始数据 (若用户本地已有账本则永不覆盖，绝不丢失用户数据)
Source: "..\build_temp\data\lijin_database.json"; DestDir: "{app}\data"; Flags: onlyifdoesntexist uninsneveruninstall

[Icons]
; 桌面专属烫金“礼”应用图标快捷方式
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\assets\app.ico"; Tasks: desktopicon
; 开始菜单快捷方式
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\assets\app.ico"
Name: "{group}\数据与备份目录"; Filename: "{app}\data"
Name: "{group}\卸载{#MyAppName}"; Filename: "{uninstallexe}"

[Run]
; 安装完成后配置防火墙入站规则 (允许同一 Wi-Fi 下手机局域网扫码记账/副屏协同)
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""礼金收聘系统·局域网协作服务"" dir=in action=allow protocol=TCP localport=8089"; Flags: runhidden; StatusMsg: "正在配置局域网协作安全策略..."
; 引导用户立即启动体验
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; 卸载前先平稳停止服务
Filename: "{app}\{#MyAppExeName}"; Parameters: "--stop"; Flags: runhidden
; 强制清理可能残留的 Node 后台进程
Filename: "taskkill"; Parameters: "/F /IM node.exe"; Flags: runhidden
; 移除局域网防火墙规则
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""礼金收聘系统·局域网协作服务"""; Flags: runhidden

[UninstallDelete]
; 清理运行时临时生成的 WebView2 缓存数据
Type: filesandordirs; Name: "{localappdata}\BanquetCashier"
