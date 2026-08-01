; Inno Setup script — packages the built TuskaEx Terminal into a single
; TuskaExTerminal-Setup.exe installer. Installs per-user (no admin / no UAC).
;
; Paths are relative to this script ({#SourcePath}) rather than absolute: the
; previous version hard-coded "D:\setupfx codes\trading terminal", which broke
; the moment the repo was cloned anywhere else.
#define MyApp "TuskaEx Terminal"
#define MyExe "terminal.exe"
#define BuildDir SourcePath + "build-msvc"

[Setup]
; A FRESH AppId, unlike the Bull4x → SwissCresta renames this build was forked
; from. Those were renames of one product, so they kept the original AppId to
; upgrade in place. TuskaEx is a different platform: reusing that AppId would
; make this installer overwrite an existing SwissCresta install and take over
; its Apps & features entry. Once published, do not change it again — that is
; what lets a later version upgrade this one.
AppId={{8CCDEF69-830D-4AAA-A9D0-4CD017B9C7B6}
AppName={#MyApp}
; Must match the version in the filename below, and that filename is what the
; website's download button already links to
; (frontend/trader/src/landing/marketing/Navbar.tsx). Bump both together, and
; the site's href with them, or the link 404s.
AppVersion=1.0.1
AppPublisher=TuskaEx
DefaultDirName={autopf}\TuskaEx Terminal
DefaultGroupName=TuskaEx Terminal
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\{#MyExe}
OutputDir={#SourcePath}dist
OutputBaseFilename=TuskaExTerminal-Setup-1.0.1
SetupIconFile={#SourcePath}resources\tuskaex.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Files]
Source: "{#BuildDir}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs; \
  Excludes: "CMakeFiles\*,terminal_autogen\*,*.obj,*.pdb,*.ilk,*.cmake,CMakeCache.txt,build.ninja,.ninja_deps,.ninja_log,*.ninja_deps,*.ninja_log,chart-diag.log"

[Icons]
Name: "{group}\TuskaEx Terminal"; Filename: "{app}\{#MyExe}"
Name: "{autodesktop}\TuskaEx Terminal"; Filename: "{app}\{#MyExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyExe}"; Description: "Launch TuskaEx Terminal"; Flags: nowait postinstall skipifsilent
