import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import WebResourceSyncer from '../../classes/syncer/WebResourceSyncer';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
        assert.throws(() => {
            const syncer = new WebResourceSyncer("", "");
        }, Error);
	});
});
