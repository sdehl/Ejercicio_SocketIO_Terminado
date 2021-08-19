const socketIO = require("socket.io");
const User = require("./models/user.model");
const Message = require("./models/message.model");

module.exports = (server) => {
  const io = socketIO(server);

  io.on("connection", (socket) => {
    console.log("Usuario conectado mediante socket con id: " + socket.id);

    socket.on("disconnect", () => {
      console.log("Se desconectó el usuario: " + socket.id);

      io.emit("usuario-desconectado", socket.username);
    });

    socket.on("set-username", async (username) => {
      try {
        // UPSERT = UPDATE + INSERT ( Si el dato se encuentra lo actualizo y sino lo encuentra lo agrega.)
        const user = await User.findOneAndUpdate(
          { username: username },
          { username: username },
          { upsert: true, new: true }
        );

        socket.username = username;

        socket.emit("set-username-ok", user);

        // if (!user) {
        //   await User.create({ username: username });
        // }
      } catch (error) {
        socket.emit("set-username-error", error);
      }
    });

    socket.on("mensaje", async (payload) => {
      console.log("Mensaje: " + payload);

      // Crear msj.
      const message = await Message.create({ text: payload });

      // Añadir el mjs al usuario.
      const user = await User.findOneAndUpdate(
        { username: socket.username },
        { $push: { message: message.id } },
        { new: true, upsert: true }
      );

      // Actualizar el usuario en el msj.
      message.user = user.id;
      await message.save();

      const datos = {
        username: user.username,
        message: message.text,
        createdAt: message.createdAt,
      };

      io.emit("mensaje-roger", datos);
    });
  });
};
