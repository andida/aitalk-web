import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import postgres from 'postgres';

const root = fs.realpathSync(process.argv[2]);
assert.ok(root.includes('/.private-backups/'));
const settings = {
  host: path.join(root, 'socket'),
  port: 55439,
  user: os.userInfo().username,
  max: 12,
  onnotice: () => {},
};
const database = 'course_atomic_test_' + Date.now();
const admin = postgres({ ...settings, database: 'postgres' });
await admin.unsafe(
  `CREATE DATABASE ${database} TEMPLATE course_restore_20261029`
);
await admin.end();
const db = postgres({ ...settings, database });
const passed = [];
const migration = fs.readFileSync(
  path.resolve(
    '../aitalk_ef/supabase/migrations/202610290001_atomic_course_completion.sql'
  ),
  'utf8'
);

function deferred() {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForBlockedQuery(marker) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const waiting = await db`
      SELECT 1
      FROM pg_catalog.pg_stat_activity
      WHERE datname=current_database()
        AND query LIKE ${`%${marker}%`}
        AND wait_event_type='Lock'
      LIMIT 1
    `;
    if (waiting.length > 0) return;
    await sleep(20);
  }
  throw new Error(`Timed out waiting for blocked query: ${marker}`);
}

try {
  await db.unsafe(migration);
  // The scoped restore does not preserve deployment-wide sequence grants.
  // This test-only grant is intentionally absent from the production migration.
  await db.unsafe(
    'GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role'
  );
  const ids = [9000001, 9000002, 9000003, 9000004];
  const foreignLanguageLesson = 9000005;
  for (const [i, id] of ids.entries()) {
    await db`INSERT INTO public.lesson_list_detail(id,lesson_name,language,level_id,lesson_key,status) VALUES(${id},'Synthetic transaction test','English',${i === 3 ? 2 : 1},${'synthetic_atomic_' + i},1)`;
  }
  await db`INSERT INTO public.lesson_list_detail(id,lesson_name,language,level_id,lesson_key,status) VALUES(${foreignLanguageLesson},'Synthetic foreign-language test','Spanish',1,'synthetic_atomic_foreign',1)`;

  let counter = 0;
  async function fixture() {
    const n = ++counter;
    const user = `f0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    const [plan] =
      await db`INSERT INTO public.user_learning_plans(user_id,language,level,current_lesson_id,status) VALUES(${user},'English','1',${ids[0]},'active') RETURNING id`;
    for (const [i, id] of ids.entries()) {
      await db`INSERT INTO public.user_learning_plan_items(plan_id,user_id,lesson_id,plan_order) VALUES(${plan.id},${user},${id},${i === 3 ? 2001 : 1001 + i})`;
    }
    return { user, plan: plan.id };
  }

  async function secondaryPlan(f) {
    const [plan] = await db`
      INSERT INTO public.user_learning_plans(
        user_id,language,level,current_lesson_id,status
      ) VALUES(${f.user},'Spanish','1',${ids[0]},'active')
      RETURNING id
    `;
    return plan.id;
  }

  const report = {
    score: 91,
    criteria_status: [],
    target_chunks_used: [],
    feedback_summary: 'Synthetic test',
    weak_points: [],
    review_items: [],
    improved_sentence: null,
  };

  async function complete(
    f,
    lesson = ids[0],
    score = 91,
    role = 'service_role',
    options = {}
  ) {
    const plan = Object.hasOwn(options, 'plan') ? options.plan : f.plan;
    const completionReport = Object.hasOwn(options, 'report')
      ? options.report
      : { ...report, score };
    const transcript = Object.hasOwn(options, 'transcript')
      ? options.transcript
      : '[]';
    return db.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL ROLE ${role}`);
      const reportParameter =
        completionReport === null ? null : tx.json(completionReport);
      const [row] =
        await tx`SELECT public.complete_course_lesson_v1(${f.user}::uuid,${lesson},${plan},${reportParameter}::jsonb,${transcript}) AS report`;
      return row.report;
    });
  }

  async function state(f) {
    const [attempts] = await db`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE trusted_completion_version=1)::int AS trusted
      FROM public.lesson_attempts
      WHERE user_id=${f.user}
    `;
    const progress = await db`
      SELECT lesson_id,plan_id,status,attempts_count,best_score,completed_at
      FROM public.user_lesson_progress
      WHERE user_id=${f.user}
      ORDER BY lesson_id
    `;
    const planItems = await db`
      SELECT lesson_id,status,started_at,completed_at
      FROM public.user_learning_plan_items
      WHERE user_id=${f.user} AND plan_id=${f.plan}
      ORDER BY plan_order
    `;
    const [plan] =
      await db`SELECT current_lesson_id FROM public.user_learning_plans WHERE id=${f.plan}`;
    const [trustedReport] = await db`
      SELECT feedback
      FROM public.lesson_attempts
      WHERE user_id=${f.user} AND trusted_completion_version=1
      ORDER BY id
      LIMIT 1
    `;
    return {
      attempts: attempts.total,
      trustedAttempts: attempts.trusted,
      progress,
      planItems,
      current: plan.current_lesson_id,
      trustedReport: trustedReport?.feedback ?? null,
    };
  }

  async function asAuthenticated(user, callback) {
    return db.begin(async (tx) => {
      await tx.unsafe('SET LOCAL ROLE authenticated');
      await tx`SELECT set_config('request.jwt.claim.sub', ${user}, true)`;
      const [identity] = await tx`SELECT auth.uid()::text AS user_id`;
      assert.equal(identity.user_id, user);
      return callback(tx);
    });
  }

  const f = await fixture();
  assert.equal((await complete(f)).score, 91);
  let s = await state(f);
  assert.equal(s.attempts, 1);
  assert.equal(s.trustedAttempts, 1);
  assert.equal(s.progress[0].attempts_count, 1);
  assert.equal(Number(s.current), ids[1]);
  const firstState = JSON.stringify(s);
  assert.equal((await complete(f, ids[0], 50)).score, 91);
  assert.equal(JSON.stringify(await state(f)), firstState);
  passed.push(
    'sequential retry returns canonical report, one attempt, stable timestamp'
  );

  const stalePlan = await secondaryPlan(f);
  await asAuthenticated(f.user, async (tx) => {
    const [stalePlanUpdate] = await tx`
      UPDATE public.user_learning_plans
      SET current_lesson_id=${ids[0]}
      WHERE id=${f.plan}
      RETURNING current_lesson_id
    `;
    assert.equal(Number(stalePlanUpdate.current_lesson_id), ids[1]);
    const [staleProgressUpdate] = await tx`
      UPDATE public.user_lesson_progress
      SET status='in_progress',progress_percent=10,best_score=0,
          attempts_count=0,completed_at=NULL,plan_id=${stalePlan}
      WHERE user_id=${f.user}
      RETURNING status,progress_percent,best_score,attempts_count,plan_id
    `;
    assert.equal(staleProgressUpdate.status, 'completed');
    assert.equal(staleProgressUpdate.progress_percent, 100);
    assert.equal(staleProgressUpdate.best_score, 91);
    assert.equal(staleProgressUpdate.attempts_count, 1);
    assert.equal(Number(staleProgressUpdate.plan_id), Number(f.plan));
  });
  assert.equal(JSON.stringify(await state(f)), firstState);
  passed.push(
    'late legacy Start cannot downgrade completed progress or replace its plan'
  );

  const mixedConcurrent = await fixture();
  const replies = await Promise.all(
    [91, 73, 88, 64, 99, 52, 80, 77, 95, 69].map((score) =>
      complete(mixedConcurrent, ids[0], score)
    )
  );
  assert.ok(replies.every((reply) => reply.score === replies[0].score));
  s = await state(mixedConcurrent);
  assert.equal(s.attempts, 1);
  assert.equal(s.trustedAttempts, 1);
  assert.equal(s.progress[0].attempts_count, 1);
  assert.equal(s.progress[0].best_score, replies[0].score);
  assert.equal(s.trustedReport.score, replies[0].score);
  passed.push(
    '10 concurrent mixed-score transactions return one canonical completion'
  );

  const crossLessonConcurrent = await fixture();
  await Promise.all([
    complete(crossLessonConcurrent, ids[0], 91),
    complete(crossLessonConcurrent, ids[1], 87),
  ]);
  s = await state(crossLessonConcurrent);
  assert.equal(s.attempts, 2);
  assert.equal(s.trustedAttempts, 2);
  assert.equal(s.progress.length, 2);
  assert.ok(s.progress.every((row) => row.status === 'completed'));
  assert.equal(Number(s.current), ids[2]);
  passed.push('concurrent adjacent lessons serialize without plan regression');

  const startFirst = await fixture();
  const startInserted = deferred();
  const releaseStart = deferred();
  const heldStart = db.begin(async (tx) => {
    await tx.unsafe('SET LOCAL ROLE authenticated');
    await tx`SELECT set_config('request.jwt.claim.sub', ${startFirst.user}, true)`;
    const [identity] = await tx`SELECT auth.uid()::text AS user_id`;
    assert.equal(identity.user_id, startFirst.user);
    const [startedProgress] = await tx`
      INSERT INTO public.user_lesson_progress(
        user_id,lesson_id,plan_id,status,progress_percent,attempts_count,best_score
      ) VALUES(${startFirst.user},${ids[0]},${startFirst.plan},'in_progress',10,0,0)
      RETURNING status
    `;
    assert.equal(startedProgress.status, 'in_progress');
    const [startedItem] = await tx`
      UPDATE public.user_learning_plan_items
      SET status='in_progress',started_at=now()
      WHERE plan_id=${startFirst.plan} AND lesson_id=${ids[0]}
      RETURNING status
    `;
    assert.equal(startedItem.status, 'in_progress');
    startInserted.resolve();
    await releaseStart.promise;
  });
  await startInserted.promise;
  const completionBehindStart = db.begin(async (tx) => {
    await tx.unsafe('SET LOCAL ROLE service_role');
    const [row] = await tx`
      SELECT /* completion_behind_legacy_start */
        public.complete_course_lesson_v1(
          ${startFirst.user}::uuid,
          ${ids[0]},
          ${startFirst.plan},
          ${tx.json(report)}::jsonb,
          '[]'
        ) AS report
    `;
    return row.report;
  });
  try {
    await waitForBlockedQuery('completion_behind_legacy_start');
  } finally {
    releaseStart.resolve();
  }
  await heldStart;
  await completionBehindStart;
  s = await state(startFirst);
  assert.equal(s.attempts, 1);
  assert.equal(s.progress[0].status, 'completed');
  assert.equal(s.progress[0].attempts_count, 1);
  assert.equal(s.planItems[0].status, 'completed');
  passed.push(
    'completion remains atomic when a legacy Start holds progress and plan item first'
  );

  const completionFirst = await fixture();
  const completionFirstStalePlan = await secondaryPlan(completionFirst);
  const completionWritten = deferred();
  const releaseCompletion = deferred();
  const heldCompletion = db.begin(async (tx) => {
    await tx.unsafe('SET LOCAL ROLE service_role');
    const [row] =
      await tx`SELECT public.complete_course_lesson_v1(${completionFirst.user}::uuid,${ids[0]},${completionFirst.plan},${tx.json(report)}::jsonb,'[]') AS report`;
    completionWritten.resolve();
    await releaseCompletion.promise;
    return row.report;
  });
  await completionWritten.promise;
  const staleStart = db.begin(async (tx) => {
    await tx.unsafe('SET LOCAL ROLE authenticated');
    await tx`SELECT set_config('request.jwt.claim.sub', ${completionFirst.user}, true)`;
    const [identity] = await tx`SELECT auth.uid()::text AS user_id`;
    assert.equal(identity.user_id, completionFirst.user);
    const [staleProgress] = await tx`
      INSERT /* stale_start_behind_completion */ INTO public.user_lesson_progress(
        user_id,lesson_id,plan_id,status,progress_percent,attempts_count,best_score
      ) VALUES(${completionFirst.user},${ids[0]},${completionFirstStalePlan},'in_progress',10,0,0)
      ON CONFLICT(user_id,lesson_id) DO UPDATE SET
        plan_id=excluded.plan_id,
        status=excluded.status,
        progress_percent=excluded.progress_percent,
        attempts_count=excluded.attempts_count,
        best_score=excluded.best_score,
        completed_at=NULL
      RETURNING status,plan_id,progress_percent,attempts_count,best_score
    `;
    assert.equal(staleProgress.status, 'completed');
    assert.equal(Number(staleProgress.plan_id), Number(completionFirst.plan));
    assert.equal(staleProgress.progress_percent, 100);
    assert.equal(staleProgress.attempts_count, 1);
    assert.equal(staleProgress.best_score, 91);
    const [staleItem] = await tx`
      UPDATE public.user_learning_plan_items
      SET status='in_progress',completed_at=NULL
      WHERE plan_id=${completionFirst.plan} AND lesson_id=${ids[0]}
      RETURNING status,completed_at
    `;
    assert.equal(staleItem.status, 'completed');
    assert.ok(staleItem.completed_at);
    const [staleCurrent] = await tx`
      UPDATE public.user_learning_plans
      SET current_lesson_id=${ids[0]},updated_at=now()
      WHERE id=${completionFirst.plan}
      RETURNING current_lesson_id
    `;
    assert.equal(Number(staleCurrent.current_lesson_id), ids[1]);
  });
  try {
    await waitForBlockedQuery('stale_start_behind_completion');
  } finally {
    releaseCompletion.resolve();
  }
  await heldCompletion;
  await staleStart;
  s = await state(completionFirst);
  assert.equal(s.attempts, 1);
  assert.equal(s.progress[0].status, 'completed');
  assert.equal(Number(s.progress[0].plan_id), Number(completionFirst.plan));
  assert.equal(s.planItems[0].status, 'completed');
  assert.equal(Number(s.current), ids[1]);
  passed.push(
    'late concurrent Start cannot downgrade progress, item or current lesson'
  );

  await complete(f, ids[1]);
  await complete(f, ids[0]);
  assert.equal(Number((await state(f)).current), ids[2]);
  passed.push('old completion cannot regress active plan');

  const foreignNext = await fixture();
  await db`
    UPDATE public.user_learning_plan_items
    SET status='completed'
    WHERE plan_id=${foreignNext.plan} AND lesson_id IN (${ids[1]},${ids[2]})
  `;
  await db`
    INSERT INTO public.user_learning_plan_items(
      plan_id,user_id,lesson_id,plan_order,status
    ) VALUES(
      ${foreignNext.plan},${foreignNext.user},${foreignLanguageLesson},1004,'not_started'
    )
  `;
  await complete(foreignNext);
  assert.equal(Number((await state(foreignNext)).current), ids[0]);
  passed.push('advancement cannot enter a same-level foreign-language item');

  const staleNextItem = await fixture();
  await db`
    INSERT INTO public.user_lesson_progress(
      user_id,lesson_id,plan_id,status,attempts_count,best_score,completed_at
    ) VALUES(
      ${staleNextItem.user},${ids[1]},${staleNextItem.plan},'completed',1,88,
      '2026-01-02T00:00:00Z'
    )
  `;
  await complete(staleNextItem);
  assert.equal(Number((await state(staleNextItem)).current), ids[2]);
  passed.push('advancement skips a next item with legacy completed progress');

  const missingCurrent = await fixture();
  await db`
    UPDATE public.user_learning_plans
    SET current_lesson_id=NULL
    WHERE id=${missingCurrent.plan}
  `;
  await complete(missingCurrent);
  assert.equal(Number((await state(missingCurrent)).current), ids[1]);
  passed.push('missing current lesson advances to the next same-level item');

  await db`
    UPDATE public.user_learning_plan_items
    SET plan_order=1004
    WHERE plan_id=${f.plan} AND lesson_id=${ids[3]}
  `;
  await complete(f, ids[2]);
  assert.equal(Number((await state(f)).current), ids[2]);
  passed.push(
    'last lesson uses authoritative lesson level even if plan_order is malformed'
  );

  const own = await fixture();
  const other = await fixture();
  await assert.rejects(
    complete({ ...own, plan: other.plan }),
    (error) => error.code === '42501'
  );
  assert.equal((await state(own)).attempts, 0);
  passed.push('cross-user plan rejected before writes');

  const missingPlan = await fixture();
  await assert.rejects(
    complete(missingPlan, ids[0], 91, 'service_role', { plan: null }),
    (error) => error.code === '22023'
  );
  assert.equal((await state(missingPlan)).attempts, 0);
  passed.push('missing plan rejected without fallback or writes');

  const inactivePlan = await fixture();
  await db`
    UPDATE public.user_learning_plans
    SET status='inactive'
    WHERE id=${inactivePlan.plan}
  `;
  await assert.rejects(
    complete(inactivePlan),
    (error) => error.code === '42501'
  );
  assert.equal((await state(inactivePlan)).attempts, 0);
  passed.push('inactive plans cannot receive trusted completions');

  const wrongLanguagePlan = await fixture();
  await db`
    UPDATE public.user_learning_plans
    SET language='Spanish'
    WHERE id=${wrongLanguagePlan.plan}
  `;
  await assert.rejects(
    complete(wrongLanguagePlan),
    (error) => error.code === '42501'
  );
  assert.equal((await state(wrongLanguagePlan)).attempts, 0);
  passed.push('lesson language must match the owned active plan');

  const wrongLevelPlan = await fixture();
  await assert.rejects(
    complete(wrongLevelPlan, ids[3]),
    (error) => error.code === '42501'
  );
  assert.equal((await state(wrongLevelPlan)).attempts, 0);
  passed.push('lesson level must match the owned active plan');

  const switchedLevelPlan = await fixture();
  await complete(switchedLevelPlan);
  await asAuthenticated(switchedLevelPlan.user, async (tx) => {
    const [switched] = await tx`
      UPDATE public.user_learning_plans
      SET level='2',current_lesson_id=${ids[3]},updated_at=now()
      WHERE id=${switchedLevelPlan.plan}
      RETURNING level,current_lesson_id
    `;
    assert.equal(switched.level, '2');
    assert.equal(Number(switched.current_lesson_id), ids[3]);
  });
  assert.equal((await complete(switchedLevelPlan, ids[3])).score, 91);
  assert.equal(Number((await state(switchedLevelPlan)).current), ids[3]);
  passed.push(
    'explicit level switches remain allowed and complete only that level'
  );

  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(
      complete(own, ids[0], 91, role),
      (error) => error.code === '42501'
    );
  }
  passed.push('anonymous/authenticated callers cannot submit trusted grades');

  for (const score of [-1, 101, 2.5]) {
    await assert.rejects(
      complete(own, ids[0], score),
      (error) => error.code === '22023'
    );
  }
  assert.equal((await state(own)).attempts, 0);
  passed.push('invalid scores rejected without writes');

  for (const malformed of [
    { ...report, criteria_status: 'invalid' },
    { ...report, weak_points: [1] },
    { ...report, improved_sentence: {} },
  ]) {
    await assert.rejects(
      complete(own, ids[0], 91, 'service_role', { report: malformed }),
      (error) => error.code === '22023'
    );
  }
  await assert.rejects(
    complete(own, ids[0], 91, 'service_role', { transcript: '{}' }),
    (error) => error.code === '22023'
  );
  await assert.rejects(
    complete(own, ids[0], 91, 'service_role', { report: null }),
    (error) => error.code === '22023'
  );
  await assert.rejects(
    complete(own, ids[0], 91, 'service_role', { transcript: null }),
    (error) => error.code === '22023'
  );
  await assert.rejects(
    complete(own, ids[0], 91, 'service_role', {
      report: { ...report, feedback_summary: '界'.repeat(22000) },
    }),
    (error) => error.code === '22023'
  );
  await assert.rejects(
    complete(own, ids[0], 91, 'service_role', {
      transcript: JSON.stringify(['界'.repeat(150001)]),
    }),
    (error) => error.code === '22023'
  );
  assert.equal((await state(own)).attempts, 0);
  passed.push('malformed and byte-oversized payloads cause no writes');

  const guarded = await fixture();
  await assert.rejects(
    asAuthenticated(
      guarded.user,
      (tx) => tx`
      INSERT INTO public.lesson_attempts(
        user_id,lesson_id,plan_id,practice_type,feedback,metadata,
        trusted_completion_version
      ) VALUES(
        ${guarded.user},${ids[0]},${guarded.plan},'guided_roleplay',
        ${tx.json(report)}::jsonb,'{}'::jsonb,1
      )
    `
    ),
    (error) =>
      error.code === '42501' &&
      error.message.includes('Trusted course attempts are service-only')
  );
  assert.equal((await state(guarded)).attempts, 0);
  passed.push('authenticated clients cannot forge the trusted attempt marker');

  const spoofed = await fixture();
  await asAuthenticated(
    spoofed.user,
    (tx) => tx`
    INSERT INTO public.lesson_attempts(
      user_id,lesson_id,plan_id,practice_type,feedback,metadata
    ) VALUES(
      ${spoofed.user},${ids[0]},${spoofed.plan},'guided_roleplay',
      ${tx.json({ ...report, score: 7 })}::jsonb,
      '{"completion_version":1,"source":"server-tutor-result"}'::jsonb
    )
  `
  );
  assert.equal((await complete(spoofed)).score, 91);
  assert.equal((await complete(spoofed, ids[0], 50)).score, 91);
  s = await state(spoofed);
  assert.equal(s.attempts, 2);
  assert.equal(s.trustedAttempts, 1);
  assert.equal(s.trustedReport.score, 91);
  passed.push('client metadata cannot spoof the canonical retry report');

  const immutable = await fixture();
  await complete(immutable);
  for (const operation of ['update', 'delete']) {
    let denied = false;
    try {
      const rows = await asAuthenticated(immutable.user, (tx) =>
        operation === 'update'
          ? tx`
              UPDATE public.lesson_attempts
              SET feedback=${tx.json({ ...report, score: 1 })}::jsonb
              WHERE user_id=${immutable.user}
                AND trusted_completion_version=1
              RETURNING id
            `
          : tx`
              DELETE FROM public.lesson_attempts
              WHERE user_id=${immutable.user}
                AND trusted_completion_version=1
              RETURNING id
            `
      );
      assert.equal(rows.length, 0);
    } catch (error) {
      denied = true;
      assert.equal(error.code, '42501');
    }
    assert.ok(denied || (await state(immutable)).trustedAttempts === 1);
  }
  s = await state(immutable);
  assert.equal(s.trustedAttempts, 1);
  assert.equal(s.trustedReport.score, 91);
  passed.push(
    'authenticated clients cannot mutate or delete canonical reports'
  );

  await db.unsafe(
    `CREATE FUNCTION public.synthetic_fail_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic injected failure'; END; $$`
  );
  for (const [table, event] of [
    ['lesson_attempts', 'INSERT'],
    ['user_lesson_progress', 'UPDATE'],
    ['user_learning_plan_items', 'UPDATE'],
    ['user_learning_plans', 'UPDATE'],
  ]) {
    const failure = await fixture();
    const before = JSON.stringify(await state(failure));
    await db.unsafe(
      `CREATE TRIGGER synthetic_failure BEFORE ${event} ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.synthetic_fail_write()`
    );
    await assert.rejects(complete(failure), (error) => error.code === 'P0001');
    assert.equal(JSON.stringify(await state(failure)), before);
    await db.unsafe(`DROP TRIGGER synthetic_failure ON public.${table}`);
    await complete(failure);
    assert.equal((await state(failure)).trustedAttempts, 1);
    passed.push(
      `${table} injected failure rolls back all writes; retry succeeds`
    );
  }

  const constrained = await fixture();
  const nullability = await db`
    SELECT column_name,is_nullable FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_lesson_progress'
      AND column_name IN ('attempts_count','status') ORDER BY column_name
  `;
  assert.deepEqual(
    nullability.map(({ column_name, is_nullable }) => ({
      column_name,
      is_nullable,
    })),
    [
      { column_name: 'attempts_count', is_nullable: 'NO' },
      { column_name: 'status', is_nullable: 'NO' },
    ]
  );
  const beforeConstraints = JSON.stringify(await state(constrained));
  for (const [status, attempts, column] of [
    [null, 0, 'status'],
    ['not_started', null, 'attempts_count'],
  ]) {
    await assert.rejects(
      db`INSERT INTO public.user_lesson_progress(
        user_id,lesson_id,plan_id,status,attempts_count
      ) VALUES(
        ${constrained.user},${ids[0]},${constrained.plan},${status},${attempts}
      )`,
      (error) => error.code === '23502' && error.column_name === column
    );
    assert.equal(JSON.stringify(await state(constrained)), beforeConstraints);
  }
  await db`INSERT INTO public.user_lesson_progress(user_id,lesson_id,plan_id)
    VALUES(${constrained.user},${ids[0]},${constrained.plan})`;
  const beforeUpdates = JSON.stringify(await state(constrained));
  await assert.rejects(
    db`UPDATE public.user_lesson_progress SET status=NULL
      WHERE user_id=${constrained.user} AND lesson_id=${ids[0]}`,
    (error) => error.code === '23502' && error.column_name === 'status'
  );
  assert.equal(JSON.stringify(await state(constrained)), beforeUpdates);
  await assert.rejects(
    db`UPDATE public.user_lesson_progress SET attempts_count=NULL
      WHERE user_id=${constrained.user} AND lesson_id=${ids[0]}`,
    (error) => error.code === '23502' && error.column_name === 'attempts_count'
  );
  assert.equal(JSON.stringify(await state(constrained)), beforeUpdates);
  await complete(constrained);
  s = await state(constrained);
  assert.equal(s.trustedAttempts, 1);
  assert.equal(s.progress[0].status, 'completed');
  assert.equal(s.progress[0].attempts_count, 1);
  passed.push(
    'real NOT NULL constraints reject invalid rows without side effects; completion succeeds'
  );

  const legacy = await fixture();
  await db`
    INSERT INTO public.user_lesson_progress(
      user_id,lesson_id,plan_id,status,attempts_count,best_score,completed_at
    ) VALUES(
      ${legacy.user},${ids[0]},${legacy.plan},'completed',2,95,
      '2026-01-01T00:00:00Z'
    )
  `;
  assert.equal(await complete(legacy), null);
  s = await state(legacy);
  assert.equal(s.attempts, 0);
  assert.equal(s.progress[0].attempts_count, 2);
  assert.equal(s.progress[0].best_score, 95);
  assert.equal(Number(s.current), ids[1]);
  passed.push(
    'legacy partial completion repairs plan without inventing attempt'
  );

  console.log(
    JSON.stringify(
      { database, passed, total: passed.length, productionChanged: false },
      null,
      2
    )
  );
} finally {
  await db.end();
}
