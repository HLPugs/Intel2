import * as config from 'config';
import { Server }  from 'socket.io';
import * as playerMap from '../../playerMap';

export const setup = (io: Server) => {
  io.on('connection', async (socket) => {
    socket.emit('siteConfiguration', config.get('app.configuration'));

    if (socket.request.session.err) {
    	socket.emit('serverError', socket.request.session.err);
	  }

    if (socket.request.session.user) {
      const user = {
        loggedIn: true,
        alias: socket.request.session.user.alias,
        avatar: socket.request.session.user.avatar,
        steamid: socket.request.session.user.steamid,
        punishments: socket.request.session.user.punishments,
      };

      socket.emit('user', user);
    } else {
      socket.emit('user', { loggedIn: false });
    }

    socket.on('home', async () => {
      // Send socket all online users' information
      const playerList = await playerMap.getAllPlayers();
      socket.emit('playerData', await playerList);

      // Add new socket to session socket list
      if (socket.request.session.sockets !== undefined) {
        socket.request.session.sockets.push(socket.id);
        socket.request.session.save((err: any) => err ? console.log(err) : null);
        if (socket.request.session.sockets.length === 1) {
          playerMap.addPlayer(socket.request.session.id, socket.request.session.user.steamid);
          socket.emit('addPlayerToData', await playerMap.getPlayer(socket.request.session.user.steamid));
        }
      }
    });

    socket.on('disconnect', () => {
      if (socket.request.session && socket.request.session.sockets !== undefined) {
        socket.request.session.reload((err: any) => {
          err ? console.log(err) : null;

          const socketIndex = socket.request.session.sockets.indexOf(socket.id);

          if (socketIndex >= 0) {
            socket.request.session.sockets.splice(socketIndex, 1);
            socket.request.session.save((err: any) => err ? console.log(err) : null);

            if (socket.request.session.sockets.length === 0) {
              // TODO: remove user from all class lists
              playerMap.removePlayer(socket.request.session.user.steamid);
              socket.emit('removePlayerFromData', socket.request.session.user.steamid);

              interface TfClass {
                name: string;
                amountPerTeam: number;
              }

              playerMap.removePlayerAllTfClasses(socket.request.session.user.steamid);

              const tfClasses: TfClass[] = config.get('app.configuration.classes');

              for (const tfClass of tfClasses) {
                io.emit('removeFromTfClass', tfClass.name, socket.request.session.user.steamid);
              }
            }
          }
        });
      }
    });
  });
};
