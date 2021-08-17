const contacts = [
  {
    id: "abc123",
    name: "John Smith",
    email: "john@acme.com",
  },
  {
    id: "def789",
    name: "Sarah Jane",
    email: "sarah@acme.com",
  },
];

export default {
  findOne: (id) => {
    return contacts.find((c) => c.id === id);
  },
  find: () => {
    return contacts;
  },
};
