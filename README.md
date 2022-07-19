# Bamboo
Simple webresource management for the [Microsoft Power Platform](https://powerplatform.microsoft.com/en-us/). Providing Dynamics365 developers the ability to edit and manage their webresources on a per-solution basis - all from within VS Code.

This extension provides the following features inside VS Code:

- Create or update webresources in PowerApps straight from VS Code.
  - Assign and customize the webresource name
  - Duplicate the resource's name from it's path on disk
- Publish webresourecs automatically
- List all webresources in a given solution in a VS Code tree view

## Getting Started
- Install the extesion [here](https://marketplace.visualstudio.com/publishers/root16)
- Add a `bamboo.conf.json` at the root of your project with the following parameters
```json
{
    ...
    "solutionName": "<your-solution-name>",
    "connectionString": "AuthType=OAuth;Url=https://<org>.crm.dynamics.com;Username=<username>;ClientId={<client-id>};LoginPrompt=Auto;RedirectUri=http://localhost;TokenCacheStorePath=C:\\Temp\\oauth-cache.txt;",
    ...
}
```
- Open up the folder which holds your webresources in VS Code


## Usage
#### Creating a WebResource
- Right click on a item in the file tree you would like to create and select the command `Create and upload webresource to Power Apps`
- Optionally input the name of the WebResource  

#### Updating a WebResource
- Right click on an item in the file tree you would like to update and select the command `Update webresource in Power Apps`
- NOTE: this requires a mapping to be saved in `bamboo.config.json`

## Usage in an Existing Solution
- If using bamboo against a previously existing solution, as of release `0.2.0` the developer has to manually assign the mappings in `bamboo.conf.json`
- For example, if the web resource is stored in Power Apps as `new_/my-webresources/forms/account.js`, the developer would define a mapping such as:
```json
{
    ...
    "fileMappings": {
        "new_/my-webresources/forms/account.js": "/path/from/bamboo.conf.json/here/account.js",
    }
    ...
}
```

## Extension Settings 

| Setting Name      | Description |
| ----------- | ----------- |
| bamboo.createWebResource.updateIfExists      | When creating a WebResource, override it's contents if it already exists       |
| bamboo.createWebResource.askForName   | When creating a WebResource, manually enter the full name (path included) of the WebResource. If set to false, this webresource will be created with a path equal to the relative path on disk from the 'package.json' in the workspace           |
| bamboo.uploadWebResource.publishIfSuccessful   | When creating or updaing a WebResource, publish the web resource if the write is successful        |
| bamboo.general.listFilesOnStartup   | When the extension is loaded, list all files in the currently selected solution in the tree explorer        |

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.
## Contact

[Open an Issue](https://github.com/Root16/bamboo/issues/new)

[Contact Us](https://root16.com/resources/contact-us/)

[Project Link](https://github.com/Root16/bamboo)