# Bamboo

Simple [Web Resource](https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/web-resources) and [Custom Control](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/create-custom-controls-using-pcf) management for the [Microsoft Power Platform](https://powerplatform.microsoft.com/en-us/). Providing developers the ability to edit and manage their web resources and custom controls on a per-solution basis - all from within VS Code.

## Features
This extension provides the following features inside VS Code:

- Create or update web resources.
- Publish web resources automatically.
- Add web resources to a solution automatically.
- Manage custom controls (PCF components) through the import + publish of solutions
- List all web resources and custom controls in a given solution in a VS Code tree view.

## Getting Started

1. Install the extension [here](https://marketplace.visualstudio.com/publishers/root16).
2. Add a `bamboo.conf.json` at the **root** of your VS Code workspace.
    - **Do not check `bamboo.conf.json` into source control.**
    - ![Example Project Strucutre](./images/project_structure.png)
3. Populate the json file with the following data:

```json
{
    "baseUrl": "https://<org>.crm.dynamics.com",
    "solutionUniqueName": "<your-solution-name>",
    "credential": {
        "type": "ClientSecret",
        "clientId": "<your-client-id>",
        "clientSecret": "<your-client-secret>",
        "tenantId": "<your-tenant-id>"
    },
    "webResources": [
        {
            "dataverseName": "new_/forms/account.js",
            "relativePathOnDisk": "path/to/new_/forms/account.js"
        },
        {
            "dataverseName": "new_/forms/contact.js",
            "relativePathOnDisk": "path/to/new_/forms/contact.js"
        }
    ],
    "customControls": [
        {
            "dataverseName": "new_NEW.ControlOne",
            "relativePathOnDiskToSolution": "path/to/ControlOneSolution.zip",
            "solutionName": "ControlOneSolution"
        },
        {
            "dataverseName": "new_NEW.ControlTwo",
            "relativePathOnDiskToSolution": "path/to/ControlTwoSolution.zip",
            "solutionName": "ControlTwoSolution"
        }
    ]
}
```

4. Reload VS Code
    - *Everytime a configuration change is made to `bamboo.conf.json` VS Code needs to be re reloaded*

## **Important Notes** 
- All paths must use the `/` seperator.
- `baseUrl` must *not* end with a `/`.
- The [app registration](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/walkthrough-register-app-azure-active-directory#confidential-client-app-registration) specified must have:
    - Access to the specified Dataverse environment
    - The appropiate Security Role necessary to:
        - Upload solutions
        - Publish solutions
        - Upload web resources
        - Publish web resources
        - Add components to solutions
- `relativePathOnDisk` and `relativePathOnDiskToSolution` must *not* start with a `/`.
- For web resources, `dataverseName` and `relativePathOnDisk` don't *need* to be similar (as shown in the example), this is just encouraged for ease of development

## Usage

## Extension Settings

| Setting Name                             | Description |
|------------------------------------------|-------------|
| `bamboo.createWebResource.updateIfExists` | When creating a WebResource, override its contents if it already exists. |

## License
Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

## Contact
- [Open an Issue](https://github.com/Root16/bamboo/issues/new)
- [Project Link](https://github.com/Root16/bamboo)

## Contributing
- This project is intended to benefit the Power Platform community as well as Root16's internal developers. 
- Contributions are most welcome.
- *But*, issues, fixes and feature requests are **not** guaranteed.