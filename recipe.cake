#load nuget:?package=Chocolatey.Docs.Cake.Recipe&version=0.1.0
#addin nuget:?package=Cake.Git&version=1.0.0

Environment.SetVariableNames();

BuildParameters.SetParameters(context: Context,
                            projectFilePath: "./Docs.csproj");

BuildParameters.PrintParameters(Context);

ToolSettings.SetToolPreprocessorDirectives();

Build.Run();