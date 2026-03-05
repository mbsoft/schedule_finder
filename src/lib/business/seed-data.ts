import type { Surveyor, ScheduleEntry } from '@/types';
import {
  clearAllData,
  getConfig,
  saveSurveyors,
  saveScheduleEntries,
} from '@/lib/storage/data-access';
import { randomUUID } from 'crypto';

export async function seedData(): Promise<void> {
  // Clear existing data
  await clearAllData();

  // Create default config (will be auto-created on first getConfig call)
  await getConfig();

  // Create Josh surveyor
  const josh: Surveyor = {
    id: 'sam-001',
    name: 'Surveyor Sam',
    home_postcode: 'B15 2TT',
    home_lat: null,
    home_lng: null,
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    territory_postcodes: [
      'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9',
      'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'WS', 'WV',
    ],
    max_jobs_per_day: 5,
    active: true,
  };
  await saveSurveyors([josh]);

  // Seed Josh's schedule
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduleTemplate = [
    // Day 1 - Monday - Dense day
    {
      offset: 0, day: 'Monday', entries: [
        { start: '08:30', end: '10:00', postcode: 'B15 2QH', type: 'Survey', area: 'Birmingham Central' },
        { start: '10:30', end: '12:00', postcode: 'B16 8QY', type: 'Survey', area: 'Edgbaston' },
        { start: '13:00', end: '14:30', postcode: 'B17 8JR', type: 'Survey', area: 'Harborne' },
        { start: '15:30', end: '17:00', postcode: 'B29 6NQ', type: 'Survey', area: 'Selly Oak' },
      ],
    },
    // Day 2 - Tuesday - Moderate day
    {
      offset: 1, day: 'Tuesday', entries: [
        { start: '09:00', end: '10:30', postcode: 'WS1 2EN', type: 'Survey', area: 'Walsall' },
        { start: '12:00', end: '13:30', postcode: 'WS3 3LH', type: 'Survey', area: 'Bloxwich' },
        { start: '15:00', end: '16:30', postcode: 'WV1 1ST', type: 'Survey', area: 'Wolverhampton' },
      ],
    },
    // Day 3 - Wednesday - Sparse day
    {
      offset: 2, day: 'Wednesday', entries: [
        { start: '10:00', end: '11:30', postcode: 'B23 6TL', type: 'Survey', area: 'Erdington' },
        { start: '14:00', end: '15:30', postcode: 'B24 9PP', type: 'Survey', area: 'Erdington North' },
      ],
    },
    // Day 4 - Thursday - Moderate day with block
    {
      offset: 3, day: 'Thursday', entries: [
        { start: '08:30', end: '10:00', postcode: 'B31 2PA', type: 'Survey', area: 'Northfield' },
        { start: '11:00', end: '12:30', postcode: 'B32 1HJ', type: 'Survey', area: 'Quinton' },
        { start: '13:30', end: '15:00', postcode: 'NO POSTCODE', type: 'BLOCK', area: 'Personal', notes: 'Doctor appointment' },
      ],
    },
    // Day 5 - Friday - Light day
    {
      offset: 4, day: 'Friday', entries: [
        { start: '09:30', end: '11:00', postcode: 'B44 8NU', type: 'Survey', area: 'Perry Barr' },
        { start: '14:30', end: '16:00', postcode: 'B42 2PP', type: 'Survey', area: 'Great Barr' },
      ],
    },
    // Week 2 - Monday
    {
      offset: 7, day: 'Monday', entries: [
        { start: '08:30', end: '10:00', postcode: 'B5 7RN', type: 'Survey', area: 'Digbeth' },
        { start: '11:00', end: '12:30', postcode: 'B9 4AA', type: 'Survey', area: 'Bordesley Green' },
        { start: '14:00', end: '15:30', postcode: 'B10 0NP', type: 'Survey', area: 'Small Heath' },
      ],
    },
    // Week 2 - Tuesday
    {
      offset: 8, day: 'Tuesday', entries: [
        { start: '09:00', end: '10:30', postcode: 'WS2 8EZ', type: 'Survey', area: 'Walsall South' },
        { start: '13:00', end: '14:30', postcode: 'WS5 4NR', type: 'Survey', area: 'Palfrey' },
      ],
    },
    // Week 2 - Wednesday - Very sparse
    {
      offset: 9, day: 'Wednesday', entries: [
        { start: '11:00', end: '12:30', postcode: 'B13 8RD', type: 'Survey', area: 'Moseley' },
      ],
    },
    // Week 2 - Thursday
    {
      offset: 10, day: 'Thursday', entries: [
        { start: '08:30', end: '10:00', postcode: 'B14 6NH', type: 'Survey', area: 'Kings Heath' },
        { start: '11:30', end: '13:00', postcode: 'B30 3HX', type: 'Survey', area: 'Stirchley' },
        { start: '15:00', end: '16:30', postcode: 'B38 8RU', type: 'Survey', area: 'Kings Norton' },
      ],
    },
    // Week 2 - Friday
    {
      offset: 11, day: 'Friday', entries: [
        { start: '10:00', end: '11:30', postcode: 'B26 3QJ', type: 'Survey', area: 'Sheldon' },
        { start: '14:00', end: '15:30', postcode: 'B33 8TH', type: 'Survey', area: 'Kitts Green' },
      ],
    },
  ];

  const allEntries: ScheduleEntry[] = [];

  for (const dayData of scheduleTemplate) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayData.offset);

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    // Skip weekends
    if (dayName === 'Saturday' || dayName === 'Sunday') continue;

    const dateStr = date.toISOString().split('T')[0];

    for (const entry of dayData.entries) {
      allEntries.push({
        id: randomUUID(),
        surveyor_id: 'sam-001',
        date: dateStr,
        day_name: dayData.day,
        start_time: entry.start,
        end_time: entry.end,
        postcode: entry.postcode,
        job_type: entry.type,
        area: entry.area || null,
        notes: ('notes' in entry ? (entry as { notes: string }).notes : null),
        lat: null,
        lng: null,
      });
    }
  }

  await saveScheduleEntries(allEntries);
}
