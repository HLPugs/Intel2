import { Server } from 'socket.io';
import * as config from 'config';

export const setup = (io: Server) => {
  io.on('connection', (socket) => {
    socket.emit('siteConfiguration', config.get('app.configuration'));

    if (socket.request.session.user) {
      const user = {
        loggedIn: true,
        alias: socket.request.session.user.username,
        avatar: socket.request.session.user.avatar.medium,
        steamid: socket.request.session.user.steamid,
        punishments: socket.request.session.user.punishments,
      };

      socket.emit('user', user);
    } else {
      socket.emit('user', { loggedIn: false });
    }
  });
};
