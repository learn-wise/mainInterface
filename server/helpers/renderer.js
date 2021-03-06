/* eslint-disable import/order */
import React from "react";
import routes from "../../client/Routes";

import { StaticRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { renderRoutes } from "react-router-config";
import { AES } from "crypto-js";
import { Helmet } from "react-helmet";
import serialize from "serialize-javascript";

import { ApolloClient, InMemoryCache } from "apollo-boost";
import { ApolloProvider, renderToStringWithData } from "react-apollo";
import { createHttpLink } from "apollo-link-http";
import https from "https";
import { getCircularReplacer } from "./links";

import fetch from "node-fetch";

export default async (req, store, context) => {
	const client = new ApolloClient({
		ssrMode: true,
		link: createHttpLink({
			fetch,
			uri: `https://localhost:3000/api/graphql`,
			onError: ({ networkError, graphQLErrors }) => {
				console.log("graphQLErrors", graphQLErrors);
				console.log("networkError", networkError);
			},
			credentials: "same-origin",
			fetchOptions: { agent: new https.Agent({ rejectUnauthorized: false }) }
		}),
		cache: new InMemoryCache()
	});
	const component = (
		<ApolloProvider client={client}>
			<Provider store={store}>
				<StaticRouter location={req.path} context={context}>
					{renderRoutes(routes)}
				</StaticRouter>
			</Provider>
		</ApolloProvider>
	);
	return renderToStringWithData(component)
		.then(content => {
			let serializedStore = serialize(store.getState());
			const helmet = Helmet.renderStatic();
			let hashedUsersList = JSON.stringify(
				AES.encrypt(serializedStore, "secret key 123"),
				getCircularReplacer()
			);
			let ApolloState = JSON.stringify(client.extract(), getCircularReplacer());
			return `
            <html>
                <head>
                    ${helmet.title.toString()}
                    ${helmet.meta.toString()}
                    ${helmet.link.toString()}
                    <link href="/stylesheets/main.css" rel="stylesheet">
                    <link href="stylesheets/main_sass.css" type="text/css">
                    <script>window.INITIAL_STATE = ${hashedUsersList}</script>
                </head>
                <body>
                    <div id="root">${content}</div>
                    <script src="/public-bundle.js"></script>
                    <script src="/public-bundle.chunk.js"></script>
                    <script>window.__APOLLO_STATE__=${ApolloState}</script>
                </body>
            </html>`;
		})
		.catch(e => e);
};

/* <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/materialize/0.98.0/css/materialize.min.css"> */
