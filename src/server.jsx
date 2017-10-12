import express from 'express';
import path from 'path';
import request from 'superagent';
import classNames from 'classnames';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { match, Route, IndexRoute, RouterContext } from 'react-router';

import i18nMiddleware from 'i18next-express-middleware';
import { I18nextProvider } from 'react-i18next';
import i18n from './common/utils/i18n';

import { API_URL } from './common/constants';
import { getHTMLTitle } from './common/utils';
import * as OiceAPI from './common/api/oice';
import * as LibraryAPI from './common/api/library';
import * as UserAPI from './common/api/user';

import IndexHTML from './IndexHTML';


const PORT = process.env.SRV_PORT || 3000;
const DEBUG = process.env.NODE_ENV !== 'production';
const DIST_PATH = path.join(__dirname, '../dist');

const routes = (
  <Route key="web" path="/*">
    {DEBUG && <Route key="ui-demo" path="ui-demo" />}
    <Route key="editor" path="edit*" />,
  </Route>
);

const server = express();

if (DEBUG) {
  const webpack = require('webpack');
  const webpackMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const webpackConfig = require('../webpack.config');

  const compiler = webpack(webpackConfig);
  server.use(webpackMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
    noInfo: false,
    quiet: false,
    lazy: false,
    watchOptions: {
      aggregateTimeout: 300,
      poll: true,
    },
    stats: {
      colors: true,
      chunks: false,
      'errors-only': true,
    },
    historyApiFallback: true,
  }));
  server.use(webpackHotMiddleware(compiler, {
    log: console.log,
    path: '/__webpack_hmr',
    heartbeat: 10 * 1000,
  }));
}

server.disable('x-powered-by');
server.use(i18nMiddleware.handle(i18n));
server.use(express.static(DIST_PATH));

server.get('*', (req, res) => {
  const reqURL = req.url;
  const baseURL = `${DEBUG ? 'http' : 'https'}://${req.get('host')}`;
  console.log(reqURL);
  match({ routes, location: reqURL }, async (error, redirectLocation, renderProps) => {
    if (error) {
      res.status(500).send(error.message);
    } else if (!renderProps) {
      console.log('404: ', redirectLocation);
      res.status(404).send('Not Found');
    } else if (redirectLocation) {
      console.log('redirectLocation: ', redirectLocation);
      res.redirect(302, redirectLocation.pathname + redirectLocation.search);
    } else {
      const { pathname } = renderProps.location;
      const fullURL = `${baseURL}${pathname}`;
      console.log('Received request: ', fullURL);

      const defaultOg = {
        url: fullURL,
        image: 'https://oice.com/static/img/banner.jpg',
      };

      const renderHTML = (props) => {
        const { t } = req;

        const oice = { ...props.oice };
        const story = { ...props.story };
        const library = { ...props.library };
        const user = { ...props.user };

        const isEditor = props.module === 'editor';
        const isAssetLibrary = props.module === 'asset-library';

        const title = getHTMLTitle(t, oice.ogTitle || oice.name || story.name || library.name || user.displayName, props.module);

        const viewport = classNames(
          `width=${isAssetLibrary || isEditor ? '1024' : 'device-width'},`,
          {
            'initial-scale=1.0, minimum-scale=1.0,': !(isAssetLibrary || isEditor),
          },
          'maximum-scale=1.0,',
          'user-scalable=no'
        );

        let ogImage = defaultOg.image;
        if (story.ogImage) {
          ogImage = story.ogImage;
        } else if (library.cover) {
          ogImage = library.cover;
        } else if (oice.storyCover) {
          ogImage = oice.storyCover;
        } else if (oice.id) {
          ogImage = `${baseURL}/static/img/oice-default-cover.jpg`;
        } else if (user.avatar) {
          ogImage = user.avatar;
        }

        const ogDescription = (
          oice.ogDescription ||
          oice.description ||
          story.description ||
          library.description ||
          user.description ||
          t('site:description')
        );
        const ogLocale = (oice.locale || req.i18n.language).replace('-', '_'); // Facebook requires underscore
        const ogUrl = defaultOg.url;

        const meta = {
          ogDescription,
          ogImage,
          ogLocale,
          ogUrl,
          title,
          viewport,
        };

        const htmlProps = {
          meta,
          module: props.module,
        };

        const htmlString = renderToStaticMarkup(
          <I18nextProvider i18n={req.i18n}>
            <IndexHTML {...htmlProps}>
              <RouterContext {...renderProps} />
            </IndexHTML>
          </I18nextProvider>
        );

        return `<!doctype html>\n${htmlString}`;
      };

      const isPathStartWith = regexPath => new RegExp(`^/${regexPath}`).test(pathname);

      const props = {
        module: 'web',
      };

      if (isPathStartWith('$') || isPathStartWith('about')) {
        // TODO: Fetch story from featured stories API
        props.story = {
          name: null, // do not append story name at the moment
        };
      } else if (isPathStartWith('story/[0-9a-f]{32}/?$')) {
        // Oice single view
        const regexUUID = /[0-9a-f]{32}/;
        const foundUUID = pathname.match(regexUUID);
        const uuid = foundUUID[0];
        props.oice = await OiceAPI.fetchOiceOgByUUID(uuid).catch((response) => {
          res.status(500).send(`Error occurs when fetching oice information ${response}`);
        });
      } else if (isPathStartWith('edit')) {
        props.module = 'editor';
      } else if (isPathStartWith('asset') || isPathStartWith('store')) {
        props.module = 'asset-library';

        // Parse library ID from path
        const matchResults = pathname.match(/^\/(asset|store)\/library\/(\d+).*/i);
        if (matchResults) {
          const libraryId = matchResults[2];
          props.library = await LibraryAPI.fetchLibraryOG(libraryId).catch((response) => {
            res.status(500).send(`Error occurs when fetching library information ${response}`);
          });
        }
      } else if (isPathStartWith('ui-demo')) {
        props.module = 'ui-demo';
      } else if (isPathStartWith('admin')) {
        props.module = 'admin-panel';
      } else if (isPathStartWith('user') || isPathStartWith('@')) {
        const matchResults = isPathStartWith('user') ? pathname.match(/^\/user\/(\d+).*/i) : pathname.match(/\/@([a-zA-Z0-9.-]+).*/);
        if (matchResults) {
          const userKey = matchResults[1];
          props.user = await UserAPI.fetchUserProfile(userKey).catch((response) => {
            res.status(404).send('User Not Found');
          });
        }
      }

      res.status(200).send(renderHTML(props));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on: ${PORT}`);
});

export default server;