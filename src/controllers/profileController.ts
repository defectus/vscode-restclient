import * as vscode from 'vscode';
import * as Constants from '../constants';
import { Func } from '../common/delegates';
import * as fs from 'async-file';
import path = require('path');
import os = require('os');
import nfs = require('fs');

const PROFILES_FILENAME: string = 'profiles.json';
const homeDir = os.homedir();

export class ProfileController {
    private _profileFolderLocation: string;
    private _selectedProfileName: string;
    private _profileStatusBarItem: vscode.StatusBarItem;
    private _profileFilename: string;

    constructor() {
        this._selectedProfileName = Constants.DefaultProfileName;
        this._profileStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this._profileStatusBarItem.show();
        this.updateStatusBar();
    }

    set profileFolderLocation(name: string) {
        this._profileFolderLocation = name;
    }

    get profileFolderLocation(): string {
        return this._profileFolderLocation;
    }

    async loadProfileData(): Promise<{ [key: string]: Func<string, string> }> {
        return fs.readFile(this.getProfileFilePath()).then(
            (file: string) => {
                let result: { [key: string]: Func<string, string> } = {},
                    json = <{ [key: string]: any }>JSON.parse(file);
                for (let elem in json[Constants.DefaultProfileName]) {
                    result[`\\${"$" + elem}`] = () => json[this._selectedProfileName][elem]
                }
                this.updateStatusBar();
                return result;
            }
        )
    }

    async changeProfile() {
        let itemPickList = await this.loadAvailableProfiles();
        let item = await vscode.window.showQuickPick(itemPickList, { placeHolder: itemPickList[0] });
        if (!item) {
            return;
        }
        this._selectedProfileName = item;
        this.updateStatusBar();
    }

    private getChannelPath(): string {
        return 'Code';
    }

    private getProfileFilePath(): string {
        let profileFile: string;
        if (this._profileFolderLocation != '') {
            profileFile = path.join(this._profileFolderLocation, PROFILES_FILENAME);
        } else {
            let appdata = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : '/var/local');
            let channelPath: string = this.getChannelPath();
            profileFile = path.join(appdata, channelPath, 'User', PROFILES_FILENAME);
            // in linux, it may not work with /var/local, then try to use /home/myuser/.config
            if ((process.platform == 'linux') && (!nfs.existsSync(profileFile))) {
                profileFile = path.join(homeDir, '.config/', channelPath, 'User', PROFILES_FILENAME);
            }
        }
        return profileFile;
    }

    private async loadAvailableProfiles(): Promise<Array<string>> {
        return fs.readFile(this.getProfileFilePath()).then(
            (file: string) => {
                let result: Array<string> = [],
                    json = <{ [key: string]: any }>JSON.parse(file);
                for (let elem in json) {
                    result.push(elem);
                }
                return result;
            }
        )
    }

    private updateStatusBar() {
        this._profileStatusBarItem.text = ' $(list-unordered) ' + this._selectedProfileName;
        this._profileStatusBarItem.tooltip = 'Active profile';
        this._profileStatusBarItem.command = 'rest-client.change-profile';
    }
}