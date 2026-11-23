type SkillRef = { id: number; name: string };
type Skills = { teaches: SkillRef[]; learns: SkillRef[] };

// What two students can do for each other (shown on public profiles).
export function skillOverlap(me: Skills, them: Skills) {
  const ids = (list: SkillRef[]) => new Set(list.map((s) => s.id));
  const myLearn = ids(me.learns);
  const myTeach = ids(me.teaches);
  return {
    theyTeachYou: them.teaches.filter((s) => myLearn.has(s.id)).map((s) => s.name),
    youTeachThem: them.learns.filter((s) => myTeach.has(s.id)).map((s) => s.name),
  };
}
