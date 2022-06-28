# Bamboo
Simple webresource management for the [Microsoft Power Platform](https://powerplatform.microsoft.com/en-us/)

Welcome to Bamboo - the simple extension for Visual Studio Code! This extension provides the following features inside VS Code:

- Create or Update Webresources in PowerApps straight from VS Code.
- Publish Webresourecs automatically

### Getting Started with Bamboo
- Install the extesion at: [LINK](google.com)
- Add a `package.json` at the root of your project with the following parameters
```
{
    ...
    "solutionName": "<your-solution-name>",
    "connectionString": "AuthType=OAuth;Url=https://<your-org>.crm.dynamics.com;Username=<your-username>;ClientId={<client-id>};LoginPrompt=Auto;RedirectUri=http://localhost;TokenCacheStorePath=C:\\Temp\\oauth-cache.txt;",
    ...
}
```
- Open up the folder which holds your Webresources in VS Code


### Creating a Webresource
- Right click on a item in the file tree you would like to create
- Select if you would like to publish the file as well
- Input the name the logical name of the Webresource  

### Updating a Webresource
- Right click on an item in the file tree you would like to update
- Select if you would like to publish the updated file as well
- Select the file in the current solution you would like to update the contents

