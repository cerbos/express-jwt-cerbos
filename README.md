# express-jwt-cerbos

An example application of integrating [Cerbos](https://cerbos.dev) with an [Express](https://expressjs.com/) server using [JSON Web Tokens](https://jwt.io/) - via [express-jwt](https://github.com/auth0/express-jwt) - for authentication.

## Dependencies

- Node.js
- Docker for running the [Cerbos Policy Decision Point (PDP)](https://docs.cerbos.dev/cerbos/0.6.0/installation/container.html)

## Getting Started

1. Start up the Cerbos PDP instance docker container. This will be called by the express app to check authorization.

```bash
cd cerbos
./start.sh
```

2. Install node dependencies

```bash
npm install
```

3. Start the express server

```bash
npm run start
```

## Policies

This example has a simple CRUD policy in place for a resource kind of `contact` - like a CRM system would have. The policy file can be found in the `cerbos/policies` folder [here](https://github.com/cerbos/express-jwt-cerbos/blob/main/cerbos/policies/contact.yaml).

Should you wish to experiment with this policy, you can <a href="https://play.cerbos.dev/p/sZC611cf06deexP0q8CTcVufTVau1SA3" target="_blank">try it in the Cerbos Playground</a>.

<a href="https://play.cerbos.dev/p/sZC611cf06deexP0q8CTcVufTVau1SA3" target="_blank"><img src="docs/launch.jpg" height="48" /></a>

The policy expects one of two roles to be set on the principal - `admin` and `user`. These roles are authorized as follows:

| Action | User | Admin |
| ------ | ---- | ----- |
| list   | Y    | Y     |
| read   | Y    | Y     |
| create | N    | Y     |
| update | N    | Y     |
| delete | N    | Y     |

## JWT Structure

For this example a JWT needs to be generated to be passed in the authorization header. The payload of the token contains an array of roles which are passed into Cerbos to use for authorization - the structure is as follows:

```
{
  sub: string,
  name: string,
  iat: number,
  roles: string[] // "user" and "admin" supported in this demo
}
```

[JWT.io](https://jwt.io) can be used generate a token for testing purposes - an [example is here](https://jwt.io/#debugger-io?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwicm9sZXMiOlsiYWRtaW4iXSwiaWF0IjoxNTE2MjM5MDIyfQ.CQEEaSdswE2tou7MUeSe4-6kfe1imJXnbqhiMFsF13A).

**Note:** The secret is hardcoded in this example to `yoursecret` and the algorithm is `HS256` - you will need to set these for the signature to be valid.

![JWT.io](/docs/jwt-token.png)

## Request Flow

1. HTTP request comes in and the `express-jwt` library validates the token and adds the payload to `req.user`.
2. The contents of the JWT token is mapped to the structure of the principal object required by Cerbos

```js
// Extract data from the JWT (check DB etc) and create the principal object to be sent to Cerbos
const jwtToPrincipal = ({ sub, iat, roles = [], ...rest }) => {
  return {
    id: sub,
    roles,
    attr: rest,
  };
};
```

3. Fetch the data required about the resource being accessed from the data store
4. Call the Cerbos PDP with the principal, resource and action to check the authorization and then return an error if the user is not authorized. The [Cerbos package](https://www.npmjs.com/package/cerbos) is used for this.

```js
const decision = await cerbos.checkResource({
  principal: jwtToPrincipal(req.user),
  resource: {
    kind: "contact",
    instances: {
      [contact.id]: {
        attr: contact,
      },
    },
  },
  actions: ["read"],
});

// authorized for read action
if (decision.isAllowed("read")) {
  return res.json(contact);
} else {
  return res.status(403).json({ error: "Unauthorized" });
}

```

5. Serve the response if authorized

## Example Requests

Once a JWT token has been generated requests can be made to the express server.

### List contacts

Allowed for `user` and `admin` roles

```bash
curl -X GET 'http://localhost:3000/contacts' \
--header 'Authorization: Bearer <token here>'
```

### Get a contact

Allowed for `user` and `admin` roles

```bash
curl -X GET 'http://localhost:3000/contacts/abc123' \
--header 'Authorization: Bearer <token here>'
```

### Create a contact

Allowed for `admin` role only

```bash
curl -X POST 'http://localhost:3000/contacts/new' \
--header 'Authorization: Bearer <token here>'
```

Should this request be made with the JWT roles set to `["admin"]` the response will be"

```json
{ "result": "Created contact" }
```

Should this request be made with the JWT roles set to `["user"]` the response will be:

```json
{ "error": "Unauthorized" }
```

### Update a contact

Allowed for `admin` role only

```bash
curl -X PATCH 'http://localhost:3000/contacts/abc123' \
--header 'Authorization: Bearer <token here>'
```

Should this request be made with the JWT roles set to `["admin"]` the response will be"

```json
{ "result": "Contact updated" }
```

Should this request be made with the JWT roles set to `["user"]` the response will be:

```json
{ "error": "Unauthorized" }
```

### Delete a contact

Allowed for `admin` role only

```bash
curl -X DELETE 'http://localhost:3000/contacts/abc123' \
--header 'Authorization: Bearer <token here>'
```

Should this request be made with the JWT roles set to `["admin"]` the response will be"

```json
{ "result": "Contact deleted" }
```

Should this request be made with the JWT roles set to `["user"]` the response will be:

```json
{ "error": "Unauthorized" }
```
