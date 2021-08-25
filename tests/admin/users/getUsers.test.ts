import { UserType } from '@prisma/client';
import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeTeam, createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, Team, User } from '../../../src/types';
import * as userOperations from '../../../src/operations/user';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import env from '../../../src/utils/env';

describe('GET /admin/users', () => {
  let user: User;
  let admin: User;
  let adminToken: string;

  before(async () => {
    user = await createFakeUser({
      firstname: 'firstname',
      lastname: 'lastname',
      email: 'email@gmail.com',
      username: 'username',
    });
    admin = await createFakeUser({
      firstname: 'admin',
      lastname: 'admin',
      email: 'admin@gmail.com',
      username: 'admin',
      type: UserType.orga,
      permission: Permission.admin,
    });
    adminToken = generateToken(admin);
  });

  after(async () => {
    // Delete the user created
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.log.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).get(`/admin/users`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .get(`/admin/users`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(userOperations, 'fetchUsers').throws('Unexpected error');

    await request(app)
      .get(`/admin/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('shoud fetch one user', async () => {
    const { body } = await request(app).get(`/admin/users`).set('Authorization', `Bearer ${adminToken}`).expect(200);

    expect(body.itemsPerPage).to.be.equal(env.api.itemsPerPage);
    expect(body.currentPage).to.be.equal(0);
    expect(body.totalItems).to.be.equal(0);
    expect(body.totalPages).to.be.equal(0);

    const responseUser = body.users.find((findUser: User) => findUser.id === user.id);

    expect(responseUser).to.deep.equal({
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      permissions: null,
      place: null,
      teamId: null,
      askingTeamId: null,
      discordId: null,
      type: user.type,
      username: user.username,
      hasPaid: false,
    });
  });

  describe('Test firstname field', () => {
    for (const firstname of ['firstname', 'first'])
      it(`should fetch the user with name ${firstname}`, async () => {
        const { body } = await request(app)
          .get(`/admin/users?firstname=${firstname}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(body.users.length).to.be.equal(1);
      });
  });

  describe('Test lastname field', () => {
    for (const lastname of ['lastname', 'last'])
      it(`should fetch the user with name ${lastname}`, async () => {
        const { body } = await request(app)
          .get(`/admin/users?lastname=${lastname}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(body.users.length).to.be.equal(1);
      });
  });

  describe('Test email field', () => {
    for (const email of ['email', 'email@gmail.com'])
      it(`should fetch the user with email ${email}`, async () => {
        const { body } = await request(app)
          .get(`/admin/users?email=${email}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(body.users.length).to.be.equal(1);
      });
  });

  describe('Test username field', () => {
    for (const username of ['username', 'user', 'adm', 'admin'])
      it(`should fetch the user with username ${username}`, async () => {
        const { body } = await request(app)
          .get(`/admin/users?username=${username}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(body.users.length).to.be.equal(1);
      });
  });

  it('should combine multiple filters', async () => {
    const { body } = await request(app)
      .get(`/admin/users?firstname=firstname&email=email&username=user`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.users.length).to.be.equal(1);
  });

  describe('Test type field', () => {
    for (const type of ['player', 'orga'])
      it(`should fetch the user with type ${type}`, async () => {
        const { body } = await request(app)
          .get(`/admin/users?type=${type}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(body.users.length).to.be.equal(1);
      });

    it(`should not fetch fetch the user because the type is incorrect`, () =>
      request(app)
        .get(`/admin/users?type=random`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400, { error: Error.InvalidQueryParameters }));
  });

  describe('Test permission field', () => {
    for (const permission of ['admin'])
      it(`should fetch the user with type ${permission}`, async () => {
        const { body } = await request(app)
          .get(`/admin/users?permission=${permission}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(body.users.length).to.be.equal(1);
      });

    it(`should not fetch fetch the user because the permission is incorrect`, () =>
      request(app)
        .get(`/admin/users?permission=random`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400, { error: Error.InvalidQueryParameters }));
  });

  describe('Test team field', () => {
    it('should fetch only the user in a team', async () => {
      const team = await createFakeTeam({ members: 1, name: 'bonjour' });

      for (const query of ['bon', 'bonjour']) {
        const { body } = await request(app)
          .get(`/admin/users?team=${query}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(body.users.length).to.be.equal(1);
      }

      // Delete the user and the team
      await database.team.delete({ where: { id: team.id } });
      await database.user.delete({ where: { id: team.captainId } });
    });

    it('should fetch not fetch the user as it is not in a team', async () => {
      const { body } = await request(app)
        .get(`/admin/users?team=random`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.users.length).to.be.equal(0);
    });
  });

  describe('Test tournament field', () => {
    let team: Team;

    before(async () => {
      team = await createFakeTeam({ members: 1, name: 'bonjour', tournament: 'lol' });
    });

    after(async () => {
      await database.team.delete({ where: { id: team.id } });
      await database.user.delete({ where: { id: team.captainId } });
    });

    it('should test the tournament field', async () => {
      const { body } = await request(app)
        .get(`/admin/users?tournament=lol`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(body.users.length).to.be.equal(1);
    });

    it('should return an error as the tournament id is incorrect', () =>
      request(app)
        .get(`/admin/users?tournament=ptdr`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400, { error: Error.InvalidQueryParameters }));
  });

  describe('Test scan field', () => {
    it('should return one scanned user', async () => {
      await database.user.update({ data: { scannedAt: new Date() }, where: { id: user.id } });
      const { body } = await request(app)
        .get(`/admin/users?scanned=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(body.users.length).to.be.equal(1);
    });

    it('should return two non scanned user (including the admin', async () => {
      await database.user.update({ data: { scannedAt: null }, where: { id: user.id } });
      const { body } = await request(app)
        .get(`/admin/users?scanned=false`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(body.users.length).to.be.equal(2);
    });
  });
});