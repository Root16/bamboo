# Powerapps-WRE README

Powerapps-WRE is a VSCode extension enabling Microsoft Dynamics 365 developers to manage their web resources directly within VSCode.

## Features

- Export, edit, then import your Microsoft Dynamics 365 web resources directly from VSCode. 
- Simple and secure authentication to Microsoft Dynamics 365.
- Easy to use commands via the command palette.

| Command      | Description |
| ----------- | ----------- |
| Powerapps: Create Authentication | Login to a Microsoft Dynamics 365 organization and save the profile.       |
| Powerapps: Select Authentication | Select which profile to be active.        |
| Powerapps: Select Solution | Select which solution to export (from D365) and unpack into the default workspace.        |
| Powerapps: Push Solution | Pack, import (to D365), then publish the current solution to the currently selected organization.        |

## Requirements

- This extension has a dependency on the [Power Platform Extension](https://marketplace.visualstudio.com/items?itemName=microsoft-IsvExpTools.powerplatform-vscode) and will prompt the user to install the extension upon login.

## Known Issues

- Currently there is no way to selectively update web resources. The import/export functionality does a complete update of the entire solution. This may cause issues if other developes are working on the same solution.

## Release Notes

### 0.1.0

Initial pre-release under the [MIT LICENSE](/LICENSE).

