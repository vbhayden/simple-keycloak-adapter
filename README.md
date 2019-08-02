## Simplified Keycloak Adapter
This is a Node module to streamline Keycloak integration Node+Express based services.  It's intended to abstract some of the boilerplate necessary to protect Express endpoints when using a Keycloak instance for SSO, but does still require some configuration to specify which instance to target.

### Installation
Edit, this is now on NPM!
```
npm install simple-keycloak-adapter --save
```

### Setup
Setup will depend on which Keycloak client you are using to protect your endpoints.  Each Keycloak client has an installation JSON file whose corresponding object you can just drop into this.  Assuming you're using a client called `my-client` on some realm `my-realm` running locally on port `8080`, your first step will be something like:

```
const keycloakHelper = require("simple-keycloak-adapter");

app.use(keycloakHelper.init({
    realm: "my-realm",
    authServerUrl: "http://localhost:8080/auth",
    client: "my-client"
}));
```
where `app` is the typical Express application instance.  Once this is in place, subsequent routes can be protected individually:
```
app.get("/protected", keycloakHelper.protect(), (req, res, next) => res.send("protected endpoint!"))
```
or through a catchall that will protect all routes declared after it:
```
app.use(keycloakHelper.protect());
```

### Example
For a full example using the above blocks:
```
const keycloakHelper = require("simple-keycloak-adapter");
const app = require("express")()

// Initialize our middleware
app.use(keycloakHelper.init({
    realm: "my-realm",
    authServerUrl: "http://localhost:8080/auth",
    client: "my-client"
}));

// Set up two routes, with the root being unprotected
app.get("/", (req, res, next) => res.send("unprotected endpoint!"))
app.get("/protected", keycloakHelper.protect(), (req, res, next) => res.send("protected endpoint!"))

// Start our server
app.listen(3000, () => console.log("listening on 3000!"))
```
### Optional Syntax
For clarity and as the underlying `keycloak-connect` library depends on hyphenated property names (`"auth-server-url"`), there are aliases provided.  When you pass one of these aliased versions, they will be assigned to their syntactically-correct equivalent before being passed to Keycloak.

| Adapter Property | Keycloak Property | 
|:----------|:------|
| `client`| `resource`|
| `authServerUrl`| `auth-server-url`|
| `bearerOnly`| `bearer-only`|
| `confidentialPort`| `confidential-port`|
| `publicClient`| `public-client`|
| `sslRequired` | `ssl-required` |

### Logout and Redirect endpoints
By default, the middleware will react to a specified path and treat that as a logout request.  We default this to `/logout`, but this can be set manually during the `.init()` call.  For example, something whose base was `/registry` might use the following endpoints:
```
app.use(keycloakHelper.init(config.keycloak, "/registry/logout", "/registry"))
```
where the first argument is the logout route and the second is where unauthorized users will be directed.

### Access Denial Handler
You can supply another optional argument to that `.init()` call to specify how a denied request should proceed.  By default, this just redirects the user to the root path, but you can supply your own:
```
let logoutHandler = (req, res, next) => res.send("unauthorized!");
app.use(keycloakHelper.init({ ... }, "/logout", "/", logoutHandler))
```

