; Inno Setup Script for Clinic Reception + Doctor Windows Desktop App
; Note: SuperAdmin is Web-only (/$uper@dmin). This installer packages ONLY Reception + Doctor for Windows PCs.

#define MyAppName "Clinic Reception & Doctor System"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "AuraCare Poly Clinic System"
#define MyAppExeName "clinic_reception_doctor_app.exe"

[Setup]
AppId={{8F4C9E2A-51B7-4E3D-9A61-7D2C8B1E4F90}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\ClinicReceptionDoctor
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\..\installers
OutputBaseFilename=Clinic-Reception-Doctor-Windows-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Files]
Source: "..\build\windows\x64\runner\Release\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\build\windows\x64\runner\Release\*.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\build\windows\x64\runner\Release\data\*"; DestDir: "{app}\data"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
