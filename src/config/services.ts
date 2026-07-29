// ---------------------------------------------------------------------------
// Services. Each generates an authority hub page (/[slug]/). Services without
// `hubOnly` also generate a page per city (/[slug]/[city]/).
//
// `garage-door-repair` is hub-only: the per-city "garage door repair {city}"
// intent is served by the city hub (/service-area/[city]/), so we don't create
// /garage-door-repair/[city]/ pages that would compete with it.
// ---------------------------------------------------------------------------
import type { ImageMetadata } from 'astro';
import garageDoorRepairImg from '../assets/real_photos/baddoor_1.jpeg';
import springRepairImg from '../assets/real_photos/spring_2.jpeg';
import openerReplaceImg from '../assets/services/opener-repair.jpeg';
import cableRepairImg from '../assets/services/cable-repair.jpeg';
import offTrackRepairImg from '../assets/real_photos/outoftrack_5.jpeg';
import newDoorImg from '../assets/services/new-door-installation.jpeg';
import emergencyRepairImg from '../assets/real_photos/carhit_1.jpeg';

export interface Faq {
  q: string;
  a: string;
}

export interface ServiceSection {
  h: string;
  body: string;
}

export interface Service {
  slug: string;
  /** Full service name, e.g. "Garage Door Spring Repair" */
  name: string;
  /** Short label for nav, cards, breadcrumbs */
  short: string;
  /** One-line summary */
  blurb: string;
  /** Intro paragraph (used on hub + city combo pages) */
  description: string;
  /** Deeper authority sections, rendered on the service hub page */
  sections: ServiceSection[];
  /** What's included / bullet points */
  points: string[];
  /** Service-level FAQs (rendered + FAQ schema on the hub page) */
  faqs: Faq[];
  image: ImageMetadata;
  imageAlt: string;
  /** CSS object-position for the photo crop (defaults to center). */
  imagePosition?: string;
  /** Hub-only: do not generate per-city combo pages. */
  hubOnly?: boolean;
  /** Flagged as an emergency/urgent service (affects copy). */
  emergency?: boolean;
}

export const SERVICES: Service[] = [
  {
    slug: 'garage-door-repair',
    name: 'Garage Door Repair',
    short: 'Garage Door Repair',
    blurb: 'Full-service garage door repair for every make and model — diagnosed and fixed, usually same day.',
    description:
      'When a garage door stops working, it disrupts your whole day — and a door stuck open is a security risk. We repair every part of the system: broken springs, dead or noisy openers, frayed cables, bent tracks, worn rollers, and damaged panels. Our technicians arrive in fully stocked trucks, diagnose the real problem, and quote an upfront price before any work begins.',
    sections: [
      {
        h: 'What we repair',
        body: 'Torsion and extension springs, garage door openers (all major brands), lift cables and drums, rollers and hinges, bent or misaligned tracks, off-track doors, safety sensors, weather seals, and dented or damaged panels. If it moves, binds, or makes noise, we can fix it.',
      },
      {
        h: 'How a repair visit works',
        body: 'We start with a full safety inspection of the door and opener, identify the root cause (not just the symptom), and walk you through the fix and the cost before starting. Most common repairs — springs, cables, rollers, opener issues — are completed in a single visit.',
      },
      {
        h: 'Repair or replace?',
        body: "We'll always tell you honestly when a repair is the smart call versus when an aging door is costing you more than it's worth. No upsells — just the recommendation we'd make for our own home.",
      },
    ],
    points: [
      'Springs, cables, rollers, tracks & openers',
      'Same-day service in most areas',
      'Upfront, flat-rate pricing',
      'All makes and models',
      'Licensed & insured technicians',
    ],
    faqs: [
      {
        q: 'How much does garage door repair cost?',
        a: 'Most common repairs fall in a predictable range depending on the part and door size. We give you an exact, upfront price before any work starts — never an hourly surprise.',
      },
      {
        q: 'Can you repair my garage door the same day?',
        a: 'In most cases, yes. Our trucks carry the common springs, cables, rollers, and opener parts needed to finish the majority of repairs on the first visit.',
      },
      {
        q: 'Do you repair all garage door brands?',
        a: 'Yes — we service every major door and opener brand, including Clopay, Wayne Dalton, Amarr, LiftMaster, Chamberlain, Genie, and more.',
      },
      {
        q: 'Is it safe to use my garage door if it sounds rough?',
        a: 'Grinding, popping, or jerking usually means a spring, cable, or roller is failing. Stop using the door and call us — operating a door with a failing spring can be dangerous.',
      },
    ],
    image: garageDoorRepairImg,
    imageAlt: 'Technician repairing a residential garage door',
    hubOnly: true,
  },
  {
    slug: 'spring-repair',
    name: 'Garage Door Spring Repair',
    short: 'Spring Repair',
    blurb: 'Fast, safe replacement of broken torsion and extension springs — same day.',
    description:
      "A broken torsion or extension spring is the most common reason a garage door won't open. Springs carry the entire weight of the door and are under extreme tension — dangerous to replace yourself. Our technicians replace worn and snapped springs safely the same day, so you're never stuck for long.",
    sections: [
      {
        h: 'Signs your spring is failing',
        body: 'The door is suddenly very heavy or won\'t open; you hear a loud "bang" from the garage; the door opens a few inches and stops; there\'s a visible gap in the coil; or the cables hang loose. Any of these means the spring needs professional replacement.',
      },
      {
        h: 'Torsion vs. extension springs',
        body: 'Torsion springs mount on a bar above the door and last longer; extension springs run along the tracks. We replace both, and recommend high-cycle springs that last significantly longer than builder-grade.',
      },
      {
        h: 'Why not DIY',
        body: 'A garage door spring stores enough energy to cause serious injury. Proper winding bars, the right spring size, and correct balancing are essential. This is the repair we most strongly recommend leaving to a pro.',
      },
    ],
    points: [
      'Torsion & extension spring replacement',
      'High-cycle springs for longer life',
      'Springs replaced in matched pairs',
      'Same-day service in most areas',
    ],
    faqs: [
      {
        q: 'How long does a garage door spring last?',
        a: 'A standard spring is rated for about 10,000 cycles — roughly 7–9 years of normal use. High-cycle springs can last 2–3 times longer.',
      },
      {
        q: 'Should I replace both springs if only one broke?',
        a: 'On a two-spring door, yes. The second spring is the same age and will fail soon — replacing both saves a second service call and keeps the door balanced.',
      },
      {
        q: 'Can I open my garage door with a broken spring?',
        a: 'You should not. Without the spring the door can weigh 150–300 lbs and may slam shut. Disconnect the opener and call for same-day service.',
      },
    ],
    image: springRepairImg,
    imageAlt: 'Technician replacing a garage door torsion spring',
  },
  {
    slug: 'opener-replacement',
    name: 'Garage Door Opener Replacement',
    short: 'Opener Replacement',
    blurb: 'Removal of your old unit and installation of a quiet, modern opener from every major brand.',
    description:
      'Opener over 15 years old, too loud, or finally dead? We remove your old unit and install a quiet, modern belt-drive opener with smartphone control and battery backup — sized to your door and set up to work reliably for years.',
    sections: [
      {
        h: 'When it’s time to replace',
        body: 'If your opener is over 15 years old, lacks rolling-code security, runs on a noisy chain drive, or needs a costly logic board, a new unit is usually the better value. We carry quiet belt-drive openers with Wi-Fi, battery backup (required by CA law on new installs), and smartphone control.',
      },
      {
        h: 'A clean, complete install',
        body: 'We haul away the old opener, mount and program the new motor, align the safety sensors, sync remotes and keypads, and balance the door so the new unit isn’t fighting worn springs. You’re left with a quiet, reliable door before we leave.',
      },
      {
        h: 'Brands we install',
        body: 'LiftMaster, Chamberlain, Genie, Sommer, Marantec, Craftsman, and more — supplied and professionally installed.',
      },
    ],
    points: [
      'New quiet belt-drive openers',
      'All major opener brands installed',
      'Old unit removal & haul-away',
      'Wi-Fi & smartphone setup',
      'Battery-backup units (CA compliant)',
    ],
    faqs: [
      {
        q: 'How long does a garage door opener replacement take?',
        a: 'Most replacements are done in about two to three hours — that includes removing the old unit, mounting and programming the new opener, aligning the sensors, and syncing your remotes.',
      },
      {
        q: 'Are new openers required to have battery backup in California?',
        a: 'Yes. California law requires residential garage door openers installed since 2019 to include a battery backup so the door works during a power outage.',
      },
      {
        q: 'Can you add smartphone control with a new opener?',
        a: 'Yes — the quiet Wi-Fi belt-drive openers we install include smartphone control, so you can open, close, and monitor your door from anywhere.',
      },
    ],
    image: openerReplaceImg,
    imageAlt: 'New garage door opener being installed',
  },
  {
    slug: 'cable-repair',
    name: 'Garage Door Cable Repair',
    short: 'Cable Repair',
    blurb: 'Replacing frayed and snapped lift cables and getting the door safely balanced again.',
    description:
      'Garage door cables work with the springs to raise and lower the door evenly. When a cable frays, slips off the drum, or snaps, the door can hang crooked, jam, or fall on one side. We replace cables, reset the drums, and rebalance the door so it runs smooth and level again.',
    sections: [
      {
        h: 'What causes cable failure',
        body: 'Rust and moisture (a real factor near the bay), drums that are out of adjustment, frayed strands from age, or a cable that came off after a spring broke. Cables almost always wear in pairs, so we inspect both sides.',
      },
      {
        h: 'Why prompt repair matters',
        body: "A door hanging by one cable is under uneven tension and can come off the track or drop unexpectedly. It's not safe to keep operating — this is a same-day repair.",
      },
    ],
    points: [
      'Lift cable & drum replacement',
      'Door re-balanced and tested',
      'Rust-resistant cables available',
      'Both cables inspected as a pair',
    ],
    faqs: [
      {
        q: 'Can a garage door work with a broken cable?',
        a: 'No — and you should stop using it. A door on one cable is unbalanced and can fall or jump the track. Disconnect the opener and call us.',
      },
      {
        q: 'Do cables and springs fail together?',
        a: 'Often, yes. A snapped spring can throw a cable off its drum, and both wear over similar timeframes. We check the whole system on every visit.',
      },
    ],
    image: cableRepairImg,
    imageAlt: 'Garage door lift cable and drum being repaired',
    imagePosition: 'center 28%',
  },
  {
    slug: 'off-track-repair',
    name: 'Off-Track Garage Door Realignment',
    short: 'Off-Track Realignment',
    blurb: 'Realigning rollers and tracks and getting a derailed door moving safely again.',
    description:
      "A door off its track or a bent rail is dangerous to force. We realign rollers, straighten or replace bent track, replace damaged rollers, and get your door rolling smoothly and safely again — often after a car bump, a broken cable, or worn rollers.",
    sections: [
      {
        h: 'Common causes',
        body: 'Backing into the door, worn or broken rollers, a snapped cable, an obstruction in the track, or loose track brackets. On hillside and older homes, settling can also pull tracks out of alignment.',
      },
      {
        h: 'Our process',
        body: 'We secure the door, ease it back onto the track, replace any bent track sections and damaged rollers, re-tighten brackets, and test the full travel and balance before we leave.',
      },
    ],
    points: [
      'Off-track door realignment',
      'Roller & track replacement',
      'Bent track repair',
      'Full safety inspection',
    ],
    faqs: [
      {
        q: 'My door came off the track — can I push it back myself?',
        a: 'We don\'t recommend it. An off-track door is under uneven tension and heavy; forcing it can cause injury or more damage. It\'s a same-day professional repair.',
      },
      {
        q: 'How do I prevent my door from going off-track again?',
        a: 'Replace worn rollers, keep the tracks clear and brackets tight, and have the door balanced annually. We cover all of that on a repair visit.',
      },
    ],
    image: offTrackRepairImg,
    imageAlt: 'Garage door track and rollers being realigned',
  },
  {
    slug: 'new-door-installation',
    name: 'New Garage Door Installation',
    short: 'New Doors',
    blurb: "Upgrade your home's curb appeal, security, and insulation with a professionally installed door.",
    description:
      "A new garage door is one of the highest-return home upgrades you can make — it transforms curb appeal, improves insulation and security, and removes the headache of an aging door. We help you choose the right style and R-value, then handle professional installation and haul-away of the old door.",
    sections: [
      {
        h: 'Door styles & materials',
        body: 'Insulated steel, modern aluminum-and-glass, carriage-house, and natural wood. We match the look to your home and the insulation to your climate — important for attached and converted garages.',
      },
      {
        h: 'What installation includes',
        body: 'Precise measurement, removal and disposal of your old door, installation of the new door, springs, and hardware, opener setup, and a full balance and safety test. Manufacturer warranties on every door.',
      },
    ],
    points: [
      'Insulated steel, wood & glass styles',
      'Professional measurement & install',
      'Old door removal & haul-away',
      'Matched openers & hardware',
      'Manufacturer warranties',
    ],
    faqs: [
      {
        q: 'How long does a new garage door installation take?',
        a: 'A standard single or double door is typically installed in a few hours. We schedule a measurement visit first to ensure an exact fit.',
      },
      {
        q: 'Will a new insulated door lower my energy bills?',
        a: 'For attached garages and rooms above them, an insulated door noticeably reduces heat transfer — a real benefit in the hotter inland East Bay.',
      },
    ],
    image: newDoorImg,
    imageAlt: 'Newly installed residential garage door',
  },
  {
    slug: 'emergency-repair',
    name: 'Emergency Garage Door Repair',
    short: 'Emergency Repair',
    blurb: 'Urgent help when your door is stuck open, jammed shut, or unsafe — fast response.',
    description:
      "A garage door that's stuck open leaves your home exposed, and one jammed shut can trap your car when you need to leave. Our emergency service prioritizes urgent calls — broken springs, snapped cables, off-track and storm-damaged doors, and openers that have failed — to get you secured and moving again as fast as possible.",
    sections: [
      {
        h: 'When to call for emergency service',
        body: "Your door won't close and the house is exposed; the door is jammed and your car is stuck inside; a spring or cable snapped loudly; the door is off-track or hanging crooked; or it was damaged by a vehicle or storm.",
      },
      {
        h: 'How we respond',
        body: "We prioritize urgent calls, arrive stocked for the most common failures, and focus first on getting your home secure and the door operable — then complete the full repair.",
      },
    ],
    points: [
      'Priority response for urgent issues',
      'Door secured & made operable fast',
      'Broken springs, cables & off-track doors',
      'Storm & vehicle-impact damage',
    ],
    faqs: [
      {
        q: 'My garage door is stuck open — what should I do?',
        a: 'Call us right away for priority service. If possible, avoid forcing it; an unbalanced door can fall. We focus first on getting your home secure.',
      },
      {
        q: 'Can you get my car out if the door is jammed shut?',
        a: 'Yes — that\'s exactly the kind of urgent call we prioritize. We\'ll safely release and operate the door so you can get on with your day.',
      },
    ],
    image: emergencyRepairImg,
    imageAlt: 'Technician responding to an emergency garage door repair',
    emergency: true,
  },
];

export const getService = (slug: string): Service | undefined =>
  SERVICES.find((s) => s.slug === slug);

/** Services that get per-city pages (everything except hub-only). */
export const MATRIX_SERVICES = SERVICES.filter((s) => !s.hubOnly);
