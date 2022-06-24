# Bamboo
Simple webresource management for the [Microsoft Power Platform](https://powerplatform.microsoft.com/en-us/).

This extension provides the following features inside VS Code:

- Create or Update Webresources in PowerApps straight from VS Code.
- Publish Webresourecs automatically
- List all webresources in a given solution in a neat tree view

## Getting Started
- Install the extesion [here](google.com)
- Add a `package.json` at the root of your project with the following parameters
```
{
    ...
    "solutionName": "<your-solution-name>",
    "connectionString": "<your-connection-string>",
    ...
}
```
- Open up the folder which holds your Webresources in VS Code


## Usage
#### Creating a Webresource
- Right click on a item in the file tree you would like to create
- Input the name the logical name of the Webresource  

#### Updating a Webresource
- Right click on an item in the file tree you would like to update
- Select the file in the current solution you would like to update the contents

## License

Distributed under the MIT License. See `LICENSE` for more information.
## Contact

[Open an Issue](https://github.com/johnyenter-briars/reverse-date-parser/issues/new)

[Contact](https://root16.com/resources/contact-us/)

[Project Link](https://github.com/Root16/bamboo)