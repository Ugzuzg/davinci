const debug = require('debug')('of-base-api');
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const requireDir = require('require-dir');
const _ = require('lodash');
const path = require('path');
const Promise = require('bluebird');
const docs = require('./openapiDocs');
const notFoundHandler = require('feathers-errors/not-found');
const errorHandler = require('feathers-errors/handler');
const fs = Promise.promisifyAll(require('fs'));

const boot = (...args) => {
	let app = args[0];
	let options = args[1];
	let callback = args[2];

	const PORT = process.env.PORT || 3000;

	if (args.length === 1) {
		callback = app;
		app = express();
	} else if (args.length === 2) {
		callback = typeof options === 'function' ? options : (callback || (() => app));
		options = {};
	}

	const checkAndAssignBootDir = async () => {

		const checkPath = async currentPath => {
			const stats = await fs.statAsync(currentPath);
			if (stats.isDirectory()) {
				return currentPath;
			}
			throw new Error('"boot" must be a directory');
		};

		const paths = [];

		paths.push(path.join(
			path.dirname(process.argv[1]),
			'src/boot'
		));

		paths.push(path.join(
			path.dirname(process.argv[1]),
			'boot'
		));

		if (options && options.bootDirPath) {
			paths.push(path.join(
				path.dirname(process.argv[1]),
				options.bootDirPath
			));
		}

		try {
			return checkPath(paths.pop());
		} catch (err) {
			if (
				paths.length > 0 &&
				(err.message.includes('ENOENT: no such file or directory') ||
				err.message.includes('"boot" must be a directory'))
			) {
				return checkPath(paths.pop());
			}
			throw err;
		}
	};

	const execBootScripts = async () => {
		const bootDirPath = await checkAndAssignBootDir();

		const bootScripts = _.values(requireDir(bootDirPath));
		return Promise.map(bootScripts, script => {
			if (typeof script === 'function') return script(app);
			return false;
		});
	};

	const configure = async () => {
		app.use(compression());
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: true }));
		process.nextTick(() => {
			docs.explorer(app, {
				discoveryUrl: '/api-doc.json',
				version: '1.0',  // read from package.json
				basePath: '/api'
			});
			app.use(notFoundHandler());
			app.use(errorHandler({ html: false }));
		});

		await execBootScripts();
		app.listen(PORT, () => debug(`Example app listening on port ${PORT}!`));
		return app;
	};

	if (typeof callback === 'function') {
		configure();
		return callback.call(app, app);
	}

	return configure();
};

module.exports = boot;
