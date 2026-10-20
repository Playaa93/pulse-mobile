import { tr, language } from "@/i18n";
// The journal's behaviour catalogue (journal-04..09): every behaviour a person can add to the daily journal, with the
// sentence the journal asks, its Select Behaviors category and the journal section it sits in. Keys are stored in
// journal_tags and journal_entries; never rename one. The nine defaults keep their original keys.

export const BEHAVIOR_CATEGORIES = [
  { key: "drugs", get label() { return tr("lib.behaviors.drugsMedication"); } },
  { key: "health", get label() { return tr("lib.behaviors.healthSymptoms"); } },
  { key: "personal", get label() { return tr("lib.behaviors.personalHealth"); } },
  { key: "lifestyle", get label() { return tr("lib.behaviors.lifestyle"); } },
  { key: "mental", get label() { return tr("lib.behaviors.mentalWellbeing"); } },
  { key: "nutrition", get label() { return tr("lib.behaviors.nutrition"); } },
  { key: "recovery", get label() { return tr("ui.shells.HomeHeader.recovery"); } },
] as const
export type BehaviorCategory = (typeof BEHAVIOR_CATEGORIES)[number]["key"]

/** The journal's sections (journal-01): when in the day the question is about. Custom behaviours sit under "custom". */
export const JOURNAL_SECTIONS = [
  { key: "daytime", get title() { return tr("lib.behaviors.daytime"); } },
  { key: "nighttime", get title() { return tr("lib.behaviors.nighttime"); } },
  { key: "status", get title() { return tr("settings.LiveHeartRate.status"); } },
  { key: "custom", get title() { return tr("lib.behaviors.yourBehaviours"); } },
] as const
export type JournalSection = (typeof JOURNAL_SECTIONS)[number]["key"]

/**
 * A follow-up asked once the answer is yes (journal-12): a slider whose value is stored beside the answer.
 * "clock" is minutes after midnight in 30-minute steps; "count" a whole number.
 */
export type FollowUp = { question: string; kind: "clock" | "count"; min: number; max: number; step: number }

export type Behavior = { key: string; sourceLabel: string; label: string; question: string; category: BehaviorCategory; section: Exclude<JournalSection, "custom">; followUp?: FollowUp }

const LAST: FollowUp = { get question() { return tr("lib.behaviors.whenDidYouLastConsumeIt"); }, kind: "clock", min: 6 * 60, max: 24 * 60 - 30, step: 30 }

export const BEHAVIORS: readonly Behavior[] = [
  { get sourceLabel() { return "Accutane"; }, key: "accutane", label: "Accutane", get question() { return tr("lib.behaviors.tookAccutane"); }, category: "drugs", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.acne", { lng: "en" }); }, key: "acne", get label() { return tr("lib.behaviors.acne"); }, get question() { return tr("lib.behaviors.experiencedAcne"); }, category: "health", section: "status" },
  { get sourceLabel() { return "Acupuncture"; }, key: "acupuncture", label: "Acupuncture", get question() { return tr("lib.behaviors.receivedAcupunctureTherapy"); }, category: "recovery", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.adHDMedication", { lng: "en" }); }, key: "adhd_medication", get label() { return tr("lib.behaviors.adHDMedication"); }, get question() { return tr("lib.behaviors.tookAdHDMedication"); }, category: "drugs", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.adaptogenMushrooms", { lng: "en" }); }, key: "adaptogens", get label() { return tr("lib.behaviors.adaptogenMushrooms"); }, get question() { return tr("lib.behaviors.tookAdaptogenMushrooms"); }, category: "nutrition", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.addedSugar", { lng: "en" }); }, key: "added_sugar", get label() { return tr("lib.behaviors.addedSugar"); }, get question() { return tr("lib.behaviors.consumedAddedSugar"); }, category: "nutrition", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.afternoonSnack", { lng: "en" }); }, key: "afternoon_snack", get label() { return tr("lib.behaviors.afternoonSnack"); }, get question() { return tr("lib.behaviors.ateAnAfternoonSnack"); }, category: "nutrition", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.airTravel", { lng: "en" }); }, key: "air_travel", get label() { return tr("lib.behaviors.airTravel"); }, get question() { return tr("lib.behaviors.travelledByPlane"); }, category: "lifestyle", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.alcohol", { lng: "en" }); }, key: "alcohol", get label() { return tr("lib.behaviors.alcohol"); }, get question() { return tr("lib.behaviors.hadAnyAlcohol"); }, category: "nutrition", section: "nighttime", followUp: { get question() { return tr("lib.behaviors.howManyDrinks"); }, kind: "count", min: 1, max: 10, step: 1 } },
  { get sourceLabel() { return tr("lib.behaviors.allergyMedication", { lng: "en" }); }, key: "allergy_medication", get label() { return tr("lib.behaviors.allergyMedication"); }, get question() { return tr("lib.behaviors.tookAllergyMedication"); }, category: "drugs", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.antiAnxietyMedication", { lng: "en" }); }, key: "anti_anxiety_medication", get label() { return tr("lib.behaviors.antiAnxietyMedication"); }, get question() { return tr("lib.behaviors.tookAntiAnxietyMedication"); }, category: "drugs", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.anxiety", { lng: "en" }); }, key: "anxiety", get label() { return tr("lib.behaviors.anxiety"); }, get question() { return tr("lib.behaviors.feltAnxious"); }, category: "mental", section: "status" },
  { get sourceLabel() { return tr("lib.behaviors.bloodDonation", { lng: "en" }); }, key: "blood_donation", get label() { return tr("lib.behaviors.bloodDonation"); }, get question() { return tr("lib.behaviors.donatedBlood"); }, category: "personal", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.caffeine", { lng: "en" }); }, key: "caffeine", get label() { return tr("lib.behaviors.caffeine"); }, get question() { return tr("lib.behaviors.hadAnyCaffeine"); }, category: "nutrition", section: "daytime", followUp: LAST },
  { get sourceLabel() { return "Camping"; }, key: "camping", label: "Camping", get question() { return tr("lib.behaviors.wentCamping"); }, category: "lifestyle", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.carOrTrainTravel", { lng: "en" }); }, key: "car_train_travel", get label() { return tr("lib.behaviors.carOrTrainTravel"); }, get question() { return tr("lib.behaviors.travelledByCarOrTrain"); }, category: "lifestyle", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.caregiving", { lng: "en" }); }, key: "caregiving", get label() { return tr("lib.behaviors.caregiving"); }, get question() { return tr("lib.behaviors.caredForSomeone"); }, category: "lifestyle", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.coldExposure", { lng: "en" }); }, key: "cold_exposure", get label() { return tr("lib.behaviors.coldExposure"); }, get question() { return tr("lib.behaviors.tookAColdPlungeOrShower"); }, category: "recovery", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.electrolytes", { lng: "en" }); }, key: "electrolytes", get label() { return tr("lib.behaviors.electrolytes"); }, get question() { return tr("lib.behaviors.tookElectrolyteSupplements"); }, category: "nutrition", section: "daytime", followUp: LAST },
  { get sourceLabel() { return tr("lib.behaviors.familyAndFriends", { lng: "en" }); }, key: "family_friends", get label() { return tr("lib.behaviors.familyAndFriends"); }, get question() { return tr("lib.behaviors.spentTimeWithFamilyOrFriends"); }, category: "mental", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.feedingBabyAtNight", { lng: "en" }); }, key: "feeding_baby", get label() { return tr("lib.behaviors.feedingBabyAtNight"); }, get question() { return tr("lib.behaviors.fedABabyAtNight"); }, category: "lifestyle", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.fever", { lng: "en" }); }, key: "fever", get label() { return tr("lib.behaviors.fever"); }, get question() { return tr("lib.behaviors.experiencingAFever"); }, category: "health", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.headache", { lng: "en" }); }, key: "headache", get label() { return tr("lib.behaviors.headache"); }, get question() { return tr("lib.behaviors.hadAHeadache"); }, category: "health", section: "status" },
  { get sourceLabel() { return tr("lib.behaviors.illness", { lng: "en" }); }, key: "illness", get label() { return tr("lib.behaviors.illness"); }, get question() { return tr("lib.behaviors.feelingSickOrIll"); }, category: "health", section: "status" },
  { get sourceLabel() { return tr("lib.behaviors.injury", { lng: "en" }); }, key: "injury", get label() { return tr("lib.behaviors.injury"); }, get question() { return tr("lib.behaviors.dealingWithAnInjury"); }, category: "health", section: "status" },
  { get sourceLabel() { return tr("lib.behaviors.intermittentFasting", { lng: "en" }); }, key: "intermittent_fasting", get label() { return tr("lib.behaviors.intermittentFasting"); }, get question() { return tr("lib.behaviors.fastedFor14HoursOrMore"); }, category: "nutrition", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.journaling", { lng: "en" }); }, key: "journaling", get label() { return tr("lib.behaviors.journaling"); }, get question() { return tr("lib.behaviors.wroteInAJournal"); }, category: "mental", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.lateCaffeine", { lng: "en" }); }, key: "late_caffeine", get label() { return tr("lib.behaviors.lateCaffeine"); }, get question() { return tr("lib.behaviors.hadCaffeineAfter2Pm"); }, category: "nutrition", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.lateMeal", { lng: "en" }); }, key: "late_meal", get label() { return tr("lib.behaviors.lateMeal"); }, get question() { return tr("lib.behaviors.ateWithinTwoHoursOfBed"); }, category: "nutrition", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.magnesium", { lng: "en" }); }, key: "magnesium", get label() { return tr("lib.behaviors.magnesium"); }, get question() { return tr("lib.behaviors.tookMagnesium"); }, category: "nutrition", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.meditation", { lng: "en" }); }, key: "meditation", get label() { return tr("lib.behaviors.meditation"); }, get question() { return tr("lib.behaviors.meditated"); }, category: "mental", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.melatonin", { lng: "en" }); }, key: "melatonin", get label() { return tr("lib.behaviors.melatonin"); }, get question() { return tr("lib.behaviors.tookMelatonin"); }, category: "drugs", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.menstruating", { lng: "en" }); }, key: "menstruating", get label() { return tr("lib.behaviors.menstruating"); }, get question() { return tr("lib.behaviors.menstruating_dc0e6c"); }, category: "personal", section: "status" },
  { get sourceLabel() { return tr("lib.behaviors.mouthTape", { lng: "en" }); }, key: "mouth_tape", get label() { return tr("lib.behaviors.mouthTape"); }, get question() { return tr("lib.behaviors.woreMouthTapeWhileSleeping"); }, category: "recovery", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.nap", { lng: "en" }); }, key: "nap", get label() { return tr("lib.behaviors.nap"); }, get question() { return tr("lib.behaviors.tookANap"); }, category: "recovery", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.nightShift", { lng: "en" }); }, key: "night_shift", get label() { return tr("lib.behaviors.nightShift"); }, get question() { return tr("lib.behaviors.workedTheNightShift"); }, category: "lifestyle", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.onCallShift", { lng: "en" }); }, key: "on_call", get label() { return tr("lib.behaviors.onCallShift"); }, get question() { return tr("lib.behaviors.workedAnOnCallShift"); }, category: "lifestyle", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.outdoorTime", { lng: "en" }); }, key: "outdoor_time", get label() { return tr("lib.behaviors.outdoorTime"); }, get question() { return tr("lib.behaviors.spentTimeOutdoors"); }, category: "lifestyle", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.parenting", { lng: "en" }); }, key: "parenting", get label() { return tr("lib.behaviors.parenting"); }, get question() { return tr("lib.behaviors.spentTheDayParenting"); }, category: "lifestyle", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.remoteWork", { lng: "en" }); }, key: "remote_work", get label() { return tr("lib.behaviors.remoteWork"); }, get question() { return tr("lib.behaviors.workedFromHome"); }, category: "lifestyle", section: "daytime" },
  { get sourceLabel() { return "Sauna"; }, key: "sauna", label: "Sauna", get question() { return tr("lib.behaviors.usedASauna"); }, category: "recovery", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.screenInBed", { lng: "en" }); }, key: "screen_in_bed", get label() { return tr("lib.behaviors.screenInBed"); }, get question() { return tr("lib.behaviors.usedAScreenInBed"); }, category: "lifestyle", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.sexualActivity", { lng: "en" }); }, key: "sexual_activity", get label() { return tr("lib.behaviors.sexualActivity"); }, get question() { return tr("lib.behaviors.hadSexualActivity"); }, category: "personal", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.sharedBedroomWithChild", { lng: "en" }); }, key: "shared_bed_child", get label() { return tr("lib.behaviors.sharedBedroomWithChild"); }, get question() { return tr("lib.behaviors.sharedABedroomWithAChild"); }, category: "lifestyle", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.sleepAid", { lng: "en" }); }, key: "sleep_aid", get label() { return tr("lib.behaviors.sleepAid"); }, get question() { return tr("lib.behaviors.tookASleepAid"); }, category: "drugs", section: "nighttime" },
  { get sourceLabel() { return tr("lib.behaviors.soreThroat", { lng: "en" }); }, key: "sore_throat", get label() { return tr("lib.behaviors.soreThroat"); }, get question() { return tr("lib.behaviors.haveASoreThroat"); }, category: "health", section: "status" },
  { get sourceLabel() { return "Stress"; }, key: "stress", label: "Stress", get question() { return tr("lib.behaviors.feltStressed"); }, category: "mental", section: "status" },
  { get sourceLabel() { return tr("lib.behaviors.stretching", { lng: "en" }); }, key: "stretching", get label() { return tr("lib.behaviors.stretching"); }, get question() { return tr("lib.behaviors.stretched"); }, category: "recovery", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.therapy", { lng: "en" }); }, key: "therapy", get label() { return tr("lib.behaviors.therapy"); }, get question() { return tr("lib.behaviors.wentToATherapySession"); }, category: "mental", section: "daytime" },
  { get sourceLabel() { return tr("lib.behaviors.travel", { lng: "en" }); }, key: "travel", get label() { return tr("lib.behaviors.travel"); }, get question() { return tr("lib.behaviors.travelledToday"); }, category: "lifestyle", section: "status" },
]

const BY_KEY = new Map(BEHAVIORS.map((b) => [b.key, b]))
export const behavior = (key: string): Behavior | undefined => BY_KEY.get(key)

/** The journal's question for a tag: the catalogue sentence, or a custom label as a question. */
export const questionOf = (tag: string, label: string) => behavior(tag)?.question ?? `${label}?`

/** A follow-up value as words: "3:30 PM" or "3". */
export function followUpText(f: FollowUp, v: number) {
  if (f.kind === "count") return String(v)
  const h = Math.floor(v / 60) % 24
  if (language() === "fr") return `${String(h).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`
  return `${h % 12 || 12}:${String(v % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

/** Built-in labels follow the app language; owner-renamed labels remain verbatim. */
export function behaviorLabel(key: string, savedLabel: string): string {
  const item = behavior(key);
  return item && savedLabel === item.sourceLabel ? item.label : savedLabel;
}
