import { Request }              from 'express';
import db                       from '../database/db';
import { QueryResult }          from 'pg';
import logger                   from './logger';
import { Player }               from '../structures/Player';
import { SteamRequest }         from 'steam-login';
import { loginUserQuery }       from '../database/queries/player';

/**
 *
 * @param {e.Request} req
 * @returns {Promise<void>} Completes after necessary login data is set in the database and the logged in user's session
 */
export const loginUser = async(req: SteamRequest): Promise<void> => {
  req.session.sockets = [];

  const steamid = req.user.steamid;
  const avatar  = req.user.avatar.medium;
  const ip      = req.headers['x-forwarded-for'];

  const player = new Player(steamid, avatar);

  // Insert Player into database, or at the very least, update their IP
  // TODO Insert / Update IP

  // Retrieve alias, captain and roles
  const res: QueryResult = await db.query(loginUserQuery, [steamid, avatar]);
  const { alias, isCaptain, roles, staffRole, isLeagueAdmin } = res.rows[0];

  // Only spend time grabbing active punishments if user exists
  if (alias !== null) {
    // Update player's session from database
    await player.updateActivePunishments();
    player.roles = roles;
    player.staffRole = staffRole;
    player.isLeagueAdmin = isLeagueAdmin;
    player.alias = alias;
    player.isCaptain = isCaptain;

    logger.info(`${alias} logged in`, { steamid });
  }
  req.session.user = player;
};
