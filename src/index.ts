/* eslint-disable max-len */
import axios from 'axios';
import {Command} from 'commander';
import CryptoJS from 'crypto-js';
const FileHound = require('filehound');
import FormData from 'form-data';
import fs from 'fs';
import mimeType from 'mime-types';
import path from 'path';
import {v4 as uuidv4} from 'uuid';
const program = new Command();
program.option('-p, --path <path>', 'path to file to be uploaded')
    .parse();
const basepath = `HomeworkCLI/upload/`;
axios.defaults.maxBodyLength = Infinity;
if (!program.getOptionValue('path')) {
  console.log('Please specify file.');
  console.log(program.helpInformation());
  process.exit(1);
}
console.log(`Selected File: ${program.getOptionValue('path')}`);
const timestamp = new Date().valueOf();
const sn = `${timestamp}${Math.floor(Math.random()*10000)}`;
const body = [{
  'r': 'system/oss-config',
  'params': {
    'tag': '',
    'system': '2',
    'global_client_version': '4.11.5(414)',
    'sn': sn,
    'token': '',
  },
}];
(async () => {
  console.log('Requesting authorization...');
  await axios.post(`http://api.ets100.com/system/oss-config?sn=${sn}`, {
    'body': Buffer.from(JSON.stringify(body)).toString('base64'),
    'head': {
      'pid': 'andriodV2',
      // eslint-disable-next-line new-cap
      'sign': CryptoJS.MD5('andriodV2' + timestamp + Buffer.from(JSON.stringify(body)).toString('base64') + '0e2e535043229af3a9fb038fab86ef6c').toString(),
      'time': timestamp,
      'version': '1.0',
    },
  }).then(async (value) => {
    console.log('Uploading...');
    const file = program.getOptionValue('path');
    const uuid = uuidv4();
    if (fs.statSync(file).isDirectory()) {
      const files = FileHound.create().path(file).findSync();
      for (const f of files) {
        await upload(value.data[0].body, f, path.dirname(file), basepath + uuid);
      }
    } else {
      await upload(value.data[0].body, file, path.dirname(file), basepath + uuid);
    }
  });
})();
// eslint-disable-next-line require-jsdoc
async function upload(sts: any, file: string, base: string, basepath: string) {
  const data = new FormData();
  data.append('name', path.parse(file).base);
  data.append('key', `${sts.dir}${basepath}${path.relative(base, file).split(path.sep).join('/')}`);
  data.append('OSSAccessKeyId', sts.accessid);
  data.append('policy', sts.policy);
  data.append('signature', sts.signature);
  data.append('success_action_status', '200');
  data.append('file', fs.readFileSync(file), {
    contentType: mimeType.lookup(path.parse(file).base) || 'application/octet-stream',
  });
  await axios.post(sts.host, data, {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${data.getBoundary()}`,
    },
  }).then((value) => {
    console.log(`http://fei.oss-cn-hangzhou.aliyuncs.com/${sts.dir}${basepath}${path.relative(base, file).split(path.sep).join('/')}`);
  });
}
