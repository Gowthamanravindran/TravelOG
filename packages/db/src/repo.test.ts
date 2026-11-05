import { beforeEach, describe, expect, it } from 'vitest';

import { fitTemplate } from '@travelog/core';

import { newId, setClock, type Db } from './db';
import {
  addAttachment,
  addBooking,
  addExpense,
  addItem,
  addMember,
  addVariant,
  castVote,
  createPoll,
  createTrip,
  deleteBooking,
  deleteExpense,
  deleteTrip,
  ensureMainVariant,
  getLocalProfile,
  getTrip,
  listAttachments,
  listBookings,
  listBudgets,
  listExpenses,
  listItems,
  listMembers,
  listTrips,
  listVariants,
  lockPoll,
  moveItem,
  myMember,
  pollResults,
  recordSettlement,
  removeMember,
  saveLocalProfile,
  setBudget,
  summarizeItems,
  tripMoney,
  updateTrip,
  upcomingReminders,
  addPhotos,
  listPhotos,
  deletePhoto,
  tripRecap,
  checkIn,
  listCheckIns,
  deleteCheckIn,
  createProject,
  listProjects,
  getProject,
  saveProjectDoc,
  duplicateProject,
  deleteProject,
  renameProject,
  tripSetupStatus,
  createProjectFromDoc,
  nextCollageTitle,
  deletePhotos,
} from './index';
import * as schema from './schema';
import { outbox } from './schema';
import { testDb } from './test-db';

let db: Db;
const me = { displayName: 'You' };

beforeEach(() => {
  db = testDb();
  setClock(() => new Date('2026-11-04T06:00:00Z'));
});

const goa = () =>
  createTrip(
    db,
    {
      title: 'Goa Monsoon Escape',
      emoji: '🌴',
      startDate: '2026-11-12',
      endDate: '2026-11-16',
      timeZone: 'Asia/Kolkata',
    },
    me,
  );

describe('profile', () => {
  it('stores the local profile', () => {
    expect(getLocalProfile(db)).toBeNull();
    saveLocalProfile(db, { displayName: ' Gowtham ', homeCurrency: 'INR', upiId: 'me@okaxis' });
    expect(getLocalProfile(db)).toEqual({
      displayName: 'Gowtham',
      homeCurrency: 'INR',
      upiId: 'me@okaxis',
    });
    expect(() =>
      saveLocalProfile(db, { displayName: ' ', homeCurrency: 'INR', upiId: null }),
    ).toThrow();
  });
});

describe('trips and members', () => {
  it('creates a trip with me as owner and queues both rows for sync', () => {
    const trip = goa();
    const members = listMembers(db, trip.id);
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ displayName: 'You', role: 'owner', isMe: true });
    expect(
      db
        .select()
        .from(outbox)
        .all()
        .map((o) => o.tableName),
    ).toEqual(['trips', 'trip_members']);
    expect(trip.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('lists trips with their state', () => {
    goa();
    createTrip(db, { title: 'Spiti', timeZone: 'Asia/Kolkata' }, me);
    const list = listTrips(db);
    expect(list.map((t) => [t.title, t.state])).toEqual([
      ['Spiti', 'planning'],
      ['Goa Monsoon Escape', 'upcoming'],
    ]);
    setClock(() => new Date('2026-11-13T06:00:00Z'));
    expect(listTrips(db).find((t) => t.title.startsWith('Goa'))?.state).toBe('live');
  });

  it('validates dates and names', () => {
    expect(() => createTrip(db, { title: '', timeZone: 'UTC' }, me)).toThrow(/name/);
    expect(() =>
      createTrip(
        db,
        { title: 'X', startDate: '2026-11-10', endDate: '2026-11-01', timeZone: 'UTC' },
        me,
      ),
    ).toThrow(/ends before/);
    expect(() =>
      createTrip(db, { title: 'X', startDate: '2026-11-10', timeZone: 'UTC' }, me),
    ).toThrow(/both/);
    const t = goa();
    expect(() => updateTrip(db, t.id, { endDate: '2026-11-01' })).toThrow(/ends before/);
  });

  it('adds and removes members, but never me', () => {
    const t = goa();
    const riya = addMember(db, t.id, 'Riya', 'riya@okaxis');
    addMember(db, t.id, 'Arjun');
    expect(listMembers(db, t.id).map((m) => m.displayName)).toEqual(['You', 'Riya', 'Arjun']);
    removeMember(db, riya.id);
    expect(listMembers(db, t.id)).toHaveLength(2);
    expect(() => removeMember(db, myMember(db, t.id)!.id)).toThrow();
  });

  it('soft-deletes trips', () => {
    const t = goa();
    deleteTrip(db, t.id);
    expect(getTrip(db, t.id)).toBeUndefined();
    expect(listTrips(db)).toHaveLength(0);
  });
});

describe('itinerary', () => {
  it('creates Plan A on demand and keeps item order', () => {
    const t = goa();
    const a = ensureMainVariant(db, t.id, '2026-11-13');
    expect(ensureMainVariant(db, t.id, '2026-11-13').id).toBe(a.id);
    const fort = addItem(db, a.id, {
      type: 'activity',
      title: 'Chapora Fort',
      startTime: '10:00',
      estCostMinor: 0,
    });
    addItem(db, a.id, { type: 'food', title: 'Curlies', startTime: '13:30', estCostMinor: 284000 });
    const kayak = addItem(db, a.id, { type: 'activity', title: 'Kayaking', estCostMinor: 160000 });
    moveItem(db, kayak.id, 0);
    expect(listItems(db, a.id).map((i) => i.title)).toEqual([
      'Kayaking',
      'Chapora Fort',
      'Curlies',
    ]);
    expect(summarizeItems(listItems(db, a.id))).toEqual({
      itemCount: 3,
      estCostMinor: 444000,
      firstStart: '10:00',
    });
    expect(() => addItem(db, a.id, { type: 'note', title: 'x', startTime: '25:00' })).toThrow();
    expect(fort.tripId).toBe(t.id);
  });

  it('adds Plan B by copying Plan A', () => {
    const t = goa();
    const a = ensureMainVariant(db, t.id, '2026-11-13');
    addItem(db, a.id, { type: 'place', title: 'Vagator' });
    const b = addVariant(db, t.id, '2026-11-13', { copyFromVariantId: a.id });
    expect(b.name).toBe('Plan B');
    expect(listItems(db, b.id).map((i) => i.title)).toEqual(['Vagator']);
    expect(listVariants(db, t.id, '2026-11-13').map((v) => [v.name, v.isMain])).toEqual([
      ['Plan A', true],
      ['Plan B', false],
    ]);
  });
});

describe('polls', () => {
  it('votes, re-votes and locks a plan-variant poll that becomes the main plan', () => {
    const t = goa();
    const riya = addMember(db, t.id, 'Riya');
    const you = myMember(db, t.id)!;
    const a = ensureMainVariant(db, t.id, '2026-11-13');
    const b = addVariant(db, t.id, '2026-11-13');
    const poll = createPoll(db, {
      tripId: t.id,
      type: 'variant',
      question: 'Which plan for Day 2?',
      options: [
        { label: 'Plan A', payload: { kind: 'variant', variantId: a.id } },
        { label: 'Plan B', payload: { kind: 'variant', variantId: b.id } },
      ],
    });
    const [optA, optB] = pollResults(db, poll.id).options;
    castVote(db, poll.id, optA!.id, you.id);
    castVote(db, poll.id, optB!.id, you.id); // single choice: moves my vote
    castVote(db, poll.id, optB!.id, riya.id);
    castVote(db, poll.id, optB!.id, riya.id); // toggles off
    castVote(db, poll.id, optB!.id, riya.id); // and back on (revived row)
    const r = pollResults(db, poll.id);
    expect(r.options.map((o) => o.count)).toEqual([0, 2]);
    expect(r.totalVoters).toBe(2);

    lockPoll(db, poll.id);
    expect(listVariants(db, t.id, '2026-11-13').find((v) => v.isMain)?.id).toBe(b.id);
    expect(() => castVote(db, poll.id, optA!.id, you.id)).toThrow(/decided/);
  });

  it('a dates poll sets the trip dates', () => {
    const t = createTrip(db, { title: 'Spiti', timeZone: 'Asia/Kolkata' }, me);
    const poll = createPoll(db, {
      tripId: t.id,
      type: 'dates',
      question: 'When?',
      options: [
        {
          label: '8–15 Nov',
          payload: { kind: 'dates', startDate: '2026-11-08', endDate: '2026-11-15' },
        },
        {
          label: '15–22 Nov',
          payload: { kind: 'dates', startDate: '2026-11-15', endDate: '2026-11-22' },
        },
      ],
    });
    const opt = pollResults(db, poll.id).options[1]!;
    lockPoll(db, poll.id, opt.id);
    expect(getTrip(db, t.id)).toMatchObject({ startDate: '2026-11-15', endDate: '2026-11-22' });
  });

  it('needs two options', () => {
    const t = goa();
    expect(() =>
      createPoll(db, { tripId: t.id, type: 'custom', question: 'Q?', options: [{ label: 'A' }] }),
    ).toThrow();
  });
});

describe('money', () => {
  it('splits expenses, nets balances and settles up', () => {
    const t = goa();
    const you = myMember(db, t.id)!;
    const riya = addMember(db, t.id, 'Riya');
    const arjun = addMember(db, t.id, 'Arjun');
    const all = [you, riya, arjun].map((m) => ({ memberId: m.id }));
    addExpense(db, {
      tripId: t.id,
      title: 'Villa',
      category: 'stay',
      amountMinor: 3000000,
      currency: 'INR',
      paidByMemberId: you.id,
      splitMethod: 'equal',
      participants: all,
    });
    addExpense(db, {
      tripId: t.id,
      title: 'Dinner',
      category: 'food',
      amountMinor: 600000,
      currency: 'INR',
      paidByMemberId: arjun.id,
      splitMethod: 'shares',
      participants: [
        { memberId: you.id, weight: 1 },
        { memberId: riya.id, weight: 1 },
        { memberId: arjun.id, weight: 2 },
      ],
    });
    const money = tripMoney(db, t.id);
    expect(money.spentMinor).toBe(3600000);
    expect(money.byCategory).toMatchObject({ stay: 3000000, food: 600000 });
    expect(money.net.get(you.id)).toBe(3000000 - 1000000 - 150000);
    expect([...money.net.values()].reduce((a, b) => a + b, 0)).toBe(0);
    expect(money.transfers.every((x) => x.toMemberId === you.id)).toBe(true);

    for (const tr of money.transfers) recordSettlement(db, { tripId: t.id, ...tr, method: 'upi' });
    expect(tripMoney(db, t.id).transfers).toEqual([]);
  });

  it('converts foreign-currency expenses to the trip currency', () => {
    const t = goa();
    const you = myMember(db, t.id)!;
    const riya = addMember(db, t.id, 'Riya');
    addExpense(db, {
      tripId: t.id,
      title: 'Ramen',
      category: 'food',
      amountMinor: 3000,
      currency: 'JPY',
      tripAmountMinor: 170000,
      paidByMemberId: riya.id,
      splitMethod: 'exact',
      participants: [
        { memberId: you.id, weight: 1000 },
        { memberId: riya.id, weight: 2000 },
      ],
    });
    const [e] = listExpenses(db, t.id);
    expect(e!.splits.reduce((a, s) => a + s.shareMinor, 0)).toBe(170000);
    expect(tripMoney(db, t.id).net.get(you.id)).toBe(-56667);
  });

  it('deletes expenses with their splits and keeps budgets editable', () => {
    const t = goa();
    const you = myMember(db, t.id)!;
    const e = addExpense(db, {
      tripId: t.id,
      title: 'Fuel',
      category: 'travel',
      amountMinor: 40000,
      currency: 'INR',
      paidByMemberId: you.id,
      splitMethod: 'equal',
      participants: [{ memberId: you.id }],
    });
    deleteExpense(db, e.id);
    expect(listExpenses(db, t.id)).toEqual([]);
    setBudget(db, t.id, 'food', 600000);
    setBudget(db, t.id, 'food', 800000);
    expect(listBudgets(db, t.id).food).toBe(800000);
    expect(() =>
      addExpense(db, {
        tripId: t.id,
        title: 'x',
        category: 'misc',
        amountMinor: 0,
        currency: 'INR',
        paidByMemberId: you.id,
        splitMethod: 'equal',
        participants: [{ memberId: you.id }],
      }),
    ).toThrow();
  });
});

describe('bookings', () => {
  it('stores bookings in time order with attachments', () => {
    const t = goa();
    const bus = addBooking(db, {
      tripId: t.id,
      type: 'bus',
      title: 'HRTC Volvo DEL→MNL',
      reference: ' 8K2QXP ',
      startsAt: '2026-11-14T13:00:00Z',
      costMinor: 725000,
      currency: 'INR',
    });
    addBooking(db, { tripId: t.id, type: 'stay', title: 'Camp', startsAt: '2026-11-12T08:00:00Z' });
    addBooking(db, { tripId: t.id, type: 'other', title: 'Travel insurance' });
    expect(listBookings(db, t.id).map((b) => b.title)).toEqual([
      'Camp',
      'HRTC Volvo DEL→MNL',
      'Travel insurance',
    ]);
    expect(bus.reference).toBe('8K2QXP');
    addAttachment(db, {
      tripId: t.id,
      bookingId: bus.id,
      name: 'ticket.pdf',
      mimeType: 'application/pdf',
      localUri: 'file:///ticket.pdf',
    });
    expect(listAttachments(db, bus.id)).toHaveLength(1);
    deleteBooking(db, bus.id);
    expect(listAttachments(db, bus.id)).toHaveLength(0);
    expect(() =>
      addBooking(db, {
        tripId: t.id,
        type: 'bus',
        title: 'x',
        startsAt: '2026-11-14T13:00:00Z',
        endsAt: '2026-11-14T12:00:00Z',
      }),
    ).toThrow();
  });
});

describe('reminders', () => {
  it('plans from bookings, main-plan items and open polls of trips that have not ended', () => {
    const t = goa();
    addBooking(db, {
      tripId: t.id,
      type: 'flight',
      title: '6E 501',
      startsAt: '2026-11-12T03:00:00Z',
    });
    const planA = ensureMainVariant(db, t.id, '2026-11-12');
    addItem(db, planA.id, { type: 'place', title: 'Fort Aguada', startTime: '16:00' });
    const planB = addVariant(db, t.id, '2026-11-12');
    addItem(db, planB.id, { type: 'place', title: 'Only in Plan B', startTime: '17:00' });
    createPoll(db, {
      tripId: t.id,
      type: 'custom',
      question: 'Dinner?',
      deadline: '2026-11-10T12:00:00Z',
      options: [{ label: 'Fish' }, { label: 'Thali' }],
    });

    const r = upcomingReminders(db);
    expect(r.map((x) => x.key.split(':')[0])).toEqual(['poll', 'booking', 'item']);
    expect(r.find((x) => x.key.startsWith('item'))?.title).toBe('Next: Fort Aguada');

    // After the trip it no longer reminds.
    expect(upcomingReminders(db, new Date('2026-11-20T00:00:00Z'))).toEqual([]);
  });
});

describe('foreign-currency expenses', () => {
  it('stores the rate used for the trip-currency amount', () => {
    const t = goa();
    const me_ = myMember(db, t.id)!;
    const e = addExpense(db, {
      tripId: t.id,
      title: 'Taxi',
      category: 'travel',
      amountMinor: 1250,
      currency: 'USD',
      tripAmountMinor: 104000,
      fxRate: '83.2',
      paidByMemberId: me_.id,
      splitMethod: 'equal',
      participants: [{ memberId: me_.id }],
    });
    expect(listExpenses(db, t.id)[0]).toMatchObject({
      id: e.id,
      fxRate: '83.2',
      tripAmountMinor: 104000,
    });
  });
});

describe('photos and recap', () => {
  it('places photos on the trip day they were taken, in the trip time zone', () => {
    const t = goa();
    const added = addPhotos(db, t.id, [
      { localUri: 'file:///a.jpg', takenAt: '2026-11-12T20:00:00Z' }, // 01:30 IST on the 13th
      { localUri: 'file:///b.jpg', takenAt: '2026-10-01T10:00:00Z' }, // before the trip
      { localUri: 'file:///c.jpg', takenAt: 'not a date' }, // falls back to now
    ]);
    expect(added.map((p) => p.dayDate)).toEqual(['2026-11-13', null, null]);
    expect(added[2]?.takenAt).toBe('2026-11-04T06:00:00.000Z');
    deletePhoto(db, added[1]!.id);
    expect(listPhotos(db, t.id)).toHaveLength(2);
  });

  it('sums up the trip for the stats card', () => {
    const t = goa();
    const me_ = myMember(db, t.id)!;
    const a = ensureMainVariant(db, t.id, '2026-11-12');
    addItem(db, a.id, { type: 'place', title: 'Fort' });
    addItem(db, a.id, { type: 'note', title: 'Carry cash' });
    const b = addVariant(db, t.id, '2026-11-12');
    addItem(db, b.id, { type: 'place', title: 'Alt' });
    addExpense(db, {
      tripId: t.id,
      title: 'Lunch',
      category: 'food',
      amountMinor: 120000,
      currency: 'INR',
      paidByMemberId: me_.id,
      splitMethod: 'equal',
      participants: [{ memberId: me_.id }],
    });
    addPhotos(db, t.id, [{ localUri: 'file:///a.jpg' }]);
    expect(tripRecap(db, t.id)).toEqual({
      days: 5,
      stops: 1,
      people: 1,
      spentMinor: 120000,
      currency: 'INR',
      photos: 1,
    });
  });
});

describe('check-ins', () => {
  it('records the local day in the trip time zone and an optional position', () => {
    const t = goa();
    const late = checkIn(db, { tripId: t.id, title: 'Baga beach', at: '2026-11-12T19:00:00Z' });
    expect(late.dayDate).toBe('2026-11-13'); // 00:30 IST
    const here = checkIn(db, {
      tripId: t.id,
      title: '  Fort Aguada ',
      at: '2026-11-13T05:00:00Z',
      position: { lat: 15.49, lng: 73.77, accuracyM: 12.4 },
    });
    expect(here).toMatchObject({ title: 'Fort Aguada', lat: 15.49, lng: 73.77, accuracyM: 12 });
    expect(listCheckIns(db, t.id, '2026-11-13').map((c) => c.id)).toEqual([late.id, here.id]);
    deleteCheckIn(db, late.id);
    expect(listCheckIns(db, t.id, '2026-11-13')).toHaveLength(1);
    expect(() => checkIn(db, { tripId: t.id, title: ' ' })).toThrow();
    expect(() =>
      checkIn(db, { tripId: t.id, title: 'X', position: { lat: 200, lng: 0 } }),
    ).toThrow();
  });
});

describe('studio projects', () => {
  it('creates a carousel filled with trip photos, saves edits, duplicates and deletes', () => {
    const t = goa();
    addPhotos(db, t.id, [
      { localUri: 'file:///a.jpg', takenAt: '2026-11-12T06:00:00Z' },
      { localUri: 'file:///b.jpg', takenAt: '2026-11-13T06:00:00Z' },
    ]);
    const p = createProject(db, { tripId: t.id, format: 'post', slides: 3, template: 'bridge' });
    expect(p).toMatchObject({ title: 'Goa Monsoon Escape', slides: 3, format: 'post' });

    const loaded = getProject(db, p.id)!;
    const photoSlots = loaded.doc.layers.filter((l) => l.kind === 'photo');
    expect(photoSlots).toHaveLength(5); // 3 slides + 2 seams
    expect(photoSlots.filter((l) => l.kind === 'photo' && l.photoId)).toHaveLength(2);

    saveProjectDoc(db, p.id, { ...loaded.doc, slides: 4 });
    expect(getProject(db, p.id)?.project.slides).toBe(4);
    renameProject(db, p.id, 'Goa ☀️');

    setClock(() => new Date('2026-11-04T07:00:00Z'));
    const copy = duplicateProject(db, p.id);
    expect(listProjects(db, t.id).map((x) => x.title)).toEqual(['Goa ☀️ (copy)', 'Goa ☀️']);
    deleteProject(db, copy.id);
    expect(listProjects(db, t.id)).toHaveLength(1);
    expect(() => renameProject(db, p.id, ' ')).toThrow();
  });

  it('survives a damaged stored document', () => {
    const t = goa();
    const p = createProject(db, { tripId: t.id, format: 'story', slides: 2, template: 'blank' });
    db.update(schema.studioProjects).set({ doc: '{broken' }).run();
    expect(getProject(db, p.id)?.doc).toMatchObject({ format: 'story', slides: 2, layers: [] });
  });
});

describe('trip setup status', () => {
  it('ticks people, budget, bookings and plan as they are added', () => {
    const t = goa();
    expect(tripSetupStatus(db, t.id)).toEqual({
      people: false,
      budget: false,
      bookings: false,
      plan: false,
    });
    addMember(db, t.id, 'Riya');
    setBudget(db, t.id, 'food', 50000);
    addBooking(db, { tripId: t.id, type: 'flight', title: '6E 501' });
    addItem(db, ensureMainVariant(db, t.id, '2026-11-12').id, { type: 'place', title: 'Fort' });
    expect(tripSetupStatus(db, t.id)).toEqual({
      people: true,
      budget: true,
      bookings: true,
      plan: true,
    });
  });
});

describe('collages from selected photos', () => {
  it('numbers collages per trip and saves a composed document', () => {
    const t = goa();
    expect(nextCollageTitle(db, t.id)).toBe('Goa Monsoon Escape · 1');
    const doc = fitTemplate('bridge', 'post', ['a', 'b', 'c'], newId, '');
    const p = createProjectFromDoc(db, t.id, doc);
    expect(p).toMatchObject({ title: 'Goa Monsoon Escape · 1', slides: 2 });
    deleteProject(db, p.id);
    // Numbers aren't reused after a delete.
    expect(nextCollageTitle(db, t.id)).toBe('Goa Monsoon Escape · 2');
  });

  it('deletes several photos and returns their files', () => {
    const t = goa();
    const [a, b, c] = addPhotos(db, t.id, [
      { localUri: 'file:///a.jpg' },
      { localUri: 'file:///b.jpg' },
      { localUri: 'file:///c.jpg' },
    ]);
    expect(deletePhotos(db, [a!.id, c!.id, 'missing'])).toEqual([
      'file:///a.jpg',
      'file:///c.jpg',
      null,
    ]);
    expect(listPhotos(db, t.id).map((p) => p.id)).toEqual([b!.id]);
  });
});
