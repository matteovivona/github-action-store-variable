/**
 * Receive and manage variables
 * Options:
 *  0: Set value "value" to variable "key"
 *  1: Retrieve value from variable "key"
 */
import {VariableDetail, VariableStatus} from "./types/variableStatus";
import artifact, {ArtifactClient, UploadOptions} from '@actions/artifact';
import {join} from 'path';
import {readFileSync, mkdirSync, writeFileSync} from 'fs';
import rimraf from 'rimraf';

import {WORKDIR} from "./config";

const defineVariableOperation = (variable: string): VariableStatus => {
    try {
        const variableContent: VariableDetail = {
            key: variable.split("=")[0],
            value: variable.split("=")[1]
        };
        if (typeof variableContent.key !== 'undefined' && typeof variableContent.value !== 'undefined') {
            return {
                operationToProceed: 0,
                variableDetail: variableContent
            }
        } else if (typeof variableContent.key !== undefined) {
            return {
                operationToProceed: 1,
                variableDetail: variableContent
            }
        } else {
            throw Error(`Both key and value are empty`)
        }
    } catch (error) {
        throw Error('Error type')
    }
}

const storeArtifact = async (variables: VariableDetail[]): Promise<void> => {
    const artifact = require('@actions/artifact');

    const client: ArtifactClient = artifact.create();
    const artifactOptions: UploadOptions = {
        retentionDays: 1 // Only keep artifacts 1 day to avoid reach limit: https://github.com/actions/toolkit/blob/c861dd8859fe5294289fcada363ce9bc71e9d260/packages/artifact/src/internal/upload-options.ts#L1
    }
    const artifactsUploadPromises: Promise<any>[] = [];

    console.log(variables);

    for (const variable of variables) {
        const file = join(WORKDIR, `${variable.key}.txt`);

        // cleanup old directories if needed
        rimraf.sync(WORKDIR);
        mkdirSync(WORKDIR);

        writeFileSync(file, variable.value, {encoding: 'utf8'});
        artifactsUploadPromises.push(client.uploadArtifact(variable.value, [file], process.cwd(), artifactOptions));
    }
    const uploadResponses = await Promise.all(artifactsUploadPromises);
    console.log(uploadResponses);
}

const manageArtifacts = async (variables: string, delimiter: string): Promise<void> => {
    const variablesDetail: VariableStatus[] = [];
    for (const variable of variables.split(delimiter)) {
        console.log("Debugging received line: ", variable);
        try {
            variablesDetail.push(defineVariableOperation(variable));
        } catch (error) {
            console.log(error)
        }
    }
    await storeArtifact(variablesDetail.filter((variable: VariableStatus) => variable.operationToProceed === 0)
        .map((variable: VariableStatus) => variable.variableDetail));
}

export default manageArtifacts;