var config = require('./package.json');

import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
  entry: config.main,
  format: config.moduleFormat,
  moduleName: config.moduleName,
  sourceMap: true,
  dest: config.moduleBuildDir + '/' + config.name + '.js',
  plugins: [
    nodeResolve(),
    babel()
  ]
};
