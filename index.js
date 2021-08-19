import express from "express";
import jwt from "express-jwt";

import { Cerbos } from "cerbos";
import db from "./db.js";

const cerbos = new Cerbos({
  hostname: "http://localhost:3592", // The Cerbos PDP instance
});

const app = express();
const checkJwt = jwt({ secret: "yoursecret", algorithms: ["HS256"] });

// Extract data from the JWT (check DB etc) and create the principal object to be sent to Cerbos
const jwtToPrincipal = ({ sub, iat, roles = [], ...rest }) => {
  return {
    id: sub,
    roles,
    attr: rest,
  };
};

// READ
app.get("/contacts/:id", checkJwt, async (req, res) => {
  // load the contact
  const contact = db.findOne(req.params.id);
  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }

  // check user is authorized
  const allowed = await cerbos.check({
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
  if (allowed.isAuthorized(contact.id, "read")) {
    return res.json(contact);
  } else {
    return res.status(403).json({ error: "Unauthorized" });
  }
});

// CREATE
app.post("/contacts/new", checkJwt, async (req, res) => {
  // check user is authorized
  const allowed = await cerbos.check({
    principal: jwtToPrincipal(req.user),
    resource: {
      kind: "contact",
      instances: {
        new: {},
      },
    },
    actions: ["create"],
  });

  // authorized for create action
  if (allowed.isAuthorized("new", "create")) {
    return res.json({ result: "Created contact" });
  } else {
    return res.status(403).json({ error: "Unauthorized" });
  }
});

// UPDATE
app.patch("/contacts/:id", checkJwt, async (req, res) => {
  const contact = db.findOne(req.params.id);
  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }

  const allowed = await cerbos.check({
    principal: jwtToPrincipal(req.user),
    resource: {
      kind: "contact",
      instances: {
        [contact.id]: {
          attr: contact,
        },
      },
    },
    actions: ["update"],
  });

  if (allowed.isAuthorized(req.params.id, "update")) {
    return res.json({
      result: `Updated contact ${req.params.id}`,
    });
  } else {
    return res.status(403).json({ error: "Unauthorized" });
  }
});

// DELETE
app.delete("/contacts/:id", checkJwt, async (req, res) => {
  const contact = db.findOne(req.params.id);
  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }

  const allowed = await cerbos.check({
    principal: jwtToPrincipal(req.user),
    resource: {
      kind: "contact",
      instances: {
        [contact.id]: {
          attr: contact,
        },
      },
    },
    actions: ["delete"],
  });

  if (allowed.isAuthorized(req.params.id, "delete")) {
    return res.json({
      result: `Contact ${req.params.id} deleted`,
    });
  } else {
    return res.status(403).json({ error: "Unauthorized" });
  }
});

// LIST
app.get("/contacts", checkJwt, async (req, res) => {
  // load the contacts
  const contacts = db.find(req.params.id);

  // check user is authorized
  const allowed = await cerbos.check({
    principal: jwtToPrincipal(req.user),
    resource: {
      kind: "contact",
      instances: contacts.reduce(function (result, item, index, array) {
        result[item.id] = item; //a, b, c
        return result;
      }, {}),
    },
    actions: ["list"],
  });

  // filter only those authorised
  const result = contacts.filter((c) => allowed.isAuthorized(c.id, "list"));

  // return the contact
  return res.json(result);
});

app.listen(3000, () => console.log("Listening on port 3000"));
