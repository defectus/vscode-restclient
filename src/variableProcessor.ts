'use strict';

import * as Constants from './constants';
import { Func } from './common/delegates';
import * as fs from 'async-file';
import { ProfileController } from './controllers/profileController'

var uuid = require('node-uuid');
var moment = require('moment');

export class VariableProcessor {

    private profileController: ProfileController;
    constructor(profileController: ProfileController) {
        this.profileController = profileController;
    }

    async processRawRequest(request: string): Promise<string> {
        let globalVariables = await this.getGlobalVariables();
        for (var variablePattern in globalVariables) {
            let regex = new RegExp(`\\{\\{${variablePattern}\\}\\}`, 'g');
            if (regex.test(request)) {
                request = request.replace(regex, globalVariables[variablePattern]);
            }
        }
        return request;
    }

    private async getGlobalVariables(): Promise<{ [key: string]: Func<string, string> }> {
        let globalVars = {
            [`\\${Constants.TimeStampVariableName}(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`]: match => {
                let regex = new RegExp(`\\${Constants.TimeStampVariableName}(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
                let groups = regex.exec(match);
                if (groups !== null && groups.length === 3) {
                    return groups[1] && groups[2]
                        ? moment.utc().add(groups[1], groups[2]).unix()
                        : moment.utc().unix();
                }
                return match;
            },
            [`\\${Constants.GuidVariableName}`]: match => uuid.v4(),
            [`\\${Constants.RandomInt}\\s(\\-?\\d+)\\s(\\-?\\d+)`]: match => {
                let regex = new RegExp(`\\${Constants.RandomInt}\\s(\\-?\\d+)\\s(\\-?\\d+)`);
                let groups = regex.exec(match);
                if (groups !== null) {
                    let min = Number(groups[1]);
                    let max = Number(groups[2]);
                    if (min < max) {
                        min = Math.ceil(min);
                        max = Math.floor(max);
                        return Math.floor(Math.random() * (max - min)) + min;
                    }
                }
                return match;
            }
        };
        let profileVars = await this.profileController.loadProfileData();
        return Object.assign({}, globalVars, profileVars);
    }
}