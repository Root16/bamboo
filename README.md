# Bamboo
Simple webresource management for the [Microsoft Power Platform](https://powerplatform.microsoft.com/en-us/). Providing Dynamics365 developers the ability to interact and manage their webresources on a per-solution basis - all from within VS Code.

This extension provides the following features inside VS Code:

- Create or Update Webresources in PowerApps straight from VS Code.
- Publish Webresourecs automatically
- List all webresources in a given solution in a VS Code tree view

## Getting Started
- Install the extesion [here](https://marketplace.visualstudio.com/publishers/root16)
- Add a `package.json` at the root of your project with the following parameters
```
{
    ...
    "bamboo-solutionName": "<your-solution-name>",
    "bamboo-connectionString": "AuthType=OAuth;Url=https://<your-org>.crm.dynamics.com;Username=<your-username>;ClientId={<client-id>};LoginPrompt=Auto;RedirectUri=http://localhost;TokenCacheStorePath=./oauth-cache.txt;",
    ...
}
```
- Open up the folder which holds your Webresources in VS Code


## Usage
#### Creating a Webresource
- Right click on a item in the file tree you would like to create
- Optionally input the name of the Webresource  

#### Updating a Webresource
- Right click on an item in the file tree you would like to update
- Select the file in the current solution you would like to update the contents

## Extension Settings 

| Setting Name      | Description |
| ----------- | ----------- |
| bamboo.createWebresource.updateIfExists      | When creating a Webresource, override it's contents if it already exists       |
| bamboo.createWebresource.askForName   | When creating a Webresource, manually enter the full name (path included) of the Webresource. If set to false, this webresource will be created with a path equal to the relative path on disk from the 'package.json' in the workspace           |
| bamboo.uploadWebresource.publishIfSuccessful   | When creating or updaing a Webresource, publish id        |
| bamboo.general.listFilesOnStartup   | When the extension is loaded, list all files in the currently selected solution in the tree explorer        |

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.
## Contact

[Open an Issue](https://github.com/johnyenter-briars/reverse-date-parser/issues/new)

[Contact Us](https://root16.com/resources/contact-us/)

[Project Link](https://github.com/Root16/bamboo)