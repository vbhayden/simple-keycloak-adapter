const session = require("express-session");
const Keycloak = require("keycloak-connect");

const memory = new session.MemoryStore();
var keycloak = undefined;

const defaults = {
    "ssl-required": "none",
    "public-client": true,
    "confidential-port": 0
}

/**
 * Keycloak Helper.
 * 
 * Set of middleware / request handlers for protecting endpoints with a Keycloak instance.
 */
module.exports = {

    /**
     * Set of credentials needed to access a confidential resource.
     * @typedef {Object} KeycloakCredentials
     * @property {string} secret - Secret key used for accessing this client.
     */
    
    /**
     * Object defining what Keycloak instance our adapter should target and how.
     * 
     * @typedef {Object} KeycloakConfig 
     * @property {KeycloakCredentials} credentials - Credentials necessary (secret).
     * @property {boolean} bearerOnly - (Alias for "bearer-only") Is this a "bearer-only" resource? Default: undefined
     * @property {string} authServerUrl - (Alias for "auth-server-url") Location of the auth server. 
     * @property {string} sslRequired - (Alias for "ssl-required") Does this requires SSL?  Default: "none"
     * @property {string} resource - Name of the Keycloak client.
     * @property {string} client - (Alias for "resource") Name of the Keycloak client.
     * @property {boolean} publicClient - (Alias for "public-client") Is this a public client? Default: true
     * @property {number} confidentialPort - (Alias for "confidential-port") Not sure what this does, set to 0. Default: 0
     * @property {string} redirectProtocol - (Custom Property) Specify which protocol to use for the redirect_uri argument.
     */

    /**
     * Initialize the Keycloak middleware for site-wide coverage.
     * 
     * @param {KeycloakConfig} config 
     * @param {string} logout 
     * @param {string} redirect 
     * @returns {RequestHandler[]} handlers
     */
    init: function(config, logout="/logout", redirect="", accessDenied=undefined) {

        // Fix our hyphen values
        if (config["auth-server-url"] == undefined)
            config["auth-server-url"] = config.authServerUrl;

        if (config["ssl-required"] == undefined)
            config["ssl-required"] = config.sslRequired;
            
        if (config["public-client"] == undefined)
            config["public-client"] = config.publicClient;

        if (config["confidential-port"] == undefined)
            config["confidential-port"] = config.confidentialPort;

        if (config["bearer-only"] == undefined && config.bearerOnly != undefined)
            config["bearer-only"] = config.bearerOnly;
        
        if (config["resource"] == undefined && config.client != undefined)
            config["resource"] = config.client;

        // Instance of the Keycloak object to use.
        keycloak = new Keycloak({store: memory}, {...defaults, ...config});

        // How to handle when our user isn't allowed onto this resource
        keycloak.accessDenied = accessDenied != undefined ? accessDenied : (req, res, next) => {
            res.redirect(redirect)
        }

        // Return a request handler using both of these
        return [
            session({
                secret: "secret",
                resave: false,
                saveUninitialized: true,
                store: memory
            }),
            keycloak.middleware({
                logout: logout
            })
        ]
    },

    /**
     * Object defining what Keycloak instance our adapter should target and how.
     * 
     * @typedef {Object} RedirectConfig 
     * @property {string} protocol - Specify which protocol to use for the redirect_uri argument.
     */
    /**
     * Requires a Keycloak login for anything accessing this resource.  Upon login, the
     * response object will contain the Keycloak user's information in res.locals.user.
     * 
     * That object has the following properties: id, name, admin, and author.
     * 
     * @param {RedirectConfig} config 
     * @returns {RequestHandler} handlers
     */
    protect: function(config) {
        return (req, res, next) => {
            function confirmRoles(token, request) {

                res.locals.user = {
                    id: token.content.sub,
                    name: token.content.preferred_username,
                    admin: token.hasRole("realm:admin"),
                    author: token.hasRole("realm:author"),
                }

                return true;
            }

            if (config == undefined)
                config = {}

            let reqOverride = {
                ...req,

                hostname: req.hostname,
                originalUrl: req.originalUrl,

                protocol: (config.protocol || req.protocol)
            }

            keycloak.protect(confirmRoles)(reqOverride, res, next);
        }
    }
}