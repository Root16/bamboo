import * as assert from 'assert';
import * as vscode from 'vscode';
import WebResourceSyncer from '../../classes/syncer/WebResourceSyncer';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
        assert.throws(() => {
            const _ = new WebResourceSyncer("", "");
        }, Error);
	});
});
