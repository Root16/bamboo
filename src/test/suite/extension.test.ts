import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
        assert.throws(() => {
            throw Error("Foo");
        }, Error);
	});
});
