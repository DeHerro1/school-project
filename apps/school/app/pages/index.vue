<script setup lang="ts">
import { ref } from "vue";
import {
  Camera,
  BellRing,
  FileText,
  ClipboardCheck,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Smartphone,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Users,
  Heart,
  ArrowRight,
  Sparkles,
} from "lucide-vue-next";
import { Card, CardContent, Button, Badge, Input, Label, Alert } from "@repo/ui";
import classTeachingImg from "~/assets/class-teaching.jpg";
import classRegisteringImg from "~/assets/class-registering.jpg";
import assemblyImg from "~/assets/assembly.jpg";

definePageMeta({ layout: "marketing" });

const api = useApi();
const { login } = useAuth();

// ---------------------------------------------------------------- content ---
const gallery = [
  {
    src: classTeachingImg,
    alt: "A teacher leading a lesson at the blackboard while students take notes at their desks",
    title: "Every lesson, backed by real records",
    description: "The teaching your staff already do — now with attendance and progress kept digitally.",
  },
  {
    src: classRegisteringImg,
    alt: "A full school assembly hall with students and staff",
    title: "Built for schools of every size",
    description: "From a single classroom to a full assembly hall, every student stays on the record.",
  },
  {
    src: assemblyImg,
    alt: "A teacher marking the class register on a phone and tablet",
    title: "Attendance marked in seconds",
    description: "Teachers take the register from a phone or tablet — parents are notified right away.",
  },
];

const highlights = [
  "Classes, attendance, timetables & fees in one place",
  "Real-time absence alerts parents can respond to",
  "Digital term reports & progress guidance",
];

const features = [
  {
    icon: Camera,
    title: "First moments, shared instantly",
    description:
      "Teachers photograph young and first-time students settling in, and parents see it the same day — no more wondering how the first weeks are going.",
  },
  {
    icon: BellRing,
    title: "Absence alerts with a reason",
    description:
      "The moment a child is marked absent, their parent is notified — and can respond right there with why, so the school always knows.",
  },
  {
    icon: FileText,
    title: "Digital term reports & guidance",
    description:
      "Grades, class position, and where a child excels — plus concrete, personal notes on how parents can help — delivered digitally, in real time.",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance, classes & timetables",
    description:
      "Homeroom registers, class lists, and timetables in one place, kept in sync across every teacher and admin.",
  },
  {
    icon: MessageCircle,
    title: "Direct messaging",
    description: "Parents and staff message each other directly — no more missed calls or lost notes.",
  },
  {
    icon: Receipt,
    title: "Fees & invoices",
    description: "Issue termly invoices, record payments, and see who's paid at a glance.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access, per school",
    description:
      "Admins, teachers, and parents each see exactly what's theirs to see — every school's data kept separate and private.",
  },
  {
    icon: Smartphone,
    title: "Works on any device",
    description:
      "No app to install — parents open a link in their phone's browser, staff work from a laptop or tablet just as easily.",
  },
  {
    icon: CalendarClock,
    title: "Real-time, always up to date",
    description:
      "Mark a register or raise an alert and it's visible immediately — nobody's waiting on an end-of-day summary.",
  },
];

const audiences = [
  {
    icon: ShieldCheck,
    tone: "bg-violet-500/10 text-violet-600",
    title: "For school admins",
    points: [
      "Onboard staff, classes, subjects & timetables in one place",
      "See attendance, alerts and fee collection at a glance",
      "Manage every parent and student record centrally",
    ],
  },
  {
    icon: GraduationCap,
    tone: "bg-emerald-500/10 text-emerald-600",
    title: "For teachers",
    points: [
      "Mark homeroom attendance in seconds",
      "Raise an absence alert with one tap",
      "Share a photo or write a term report from any device",
    ],
  },
  {
    icon: Heart,
    tone: "bg-rose-500/10 text-rose-600",
    title: "For parents",
    points: [
      "See your child's first days as they happen",
      "Get notified the moment they're marked absent",
      "Read report cards and message teachers directly",
    ],
  },
];

const steps = [
  {
    title: "Create your account",
    description: "Fill in the form below and choose a password — it takes less than a minute.",
  },
  {
    title: "You're in immediately",
    description: "No waiting for approval — your account is ready the moment you sign up.",
  },
  {
    title: "Add your school and go",
    description: "Sign in, add your classes and students, and start day one.",
  },
];

const faqs = [
  {
    q: "Do parents need to install an app?",
    a: "No. EduCore runs in the browser, so parents just open a link on their phone or computer — nothing to download.",
  },
  {
    q: "Is our students' data kept private?",
    a: "Yes. Every school's records are kept separate, and access is role-based — parents only ever see their own children, and staff only see their own school.",
  },
  {
    q: "Can we bring in our existing student records?",
    a: "Yes — once you're signed in, add your classes and students yourself, or reach out and we'll help you migrate existing records.",
  },
  {
    q: "What does it cost?",
    a: "This is a demo — sign up and explore free of charge.",
  },
  {
    q: "How long does setup take?",
    a: "No waiting — create your account and you're signed in right away.",
  },
];

// ------------------------------------------------------------------ form ----
const form = ref({
  schoolName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  password: "",
});
const submitting = ref(false);
const error = ref("");
// Maps the server's schema field names (schoolName/name/email/phone) back to
// this form's own field names (contactName/contactEmail/contactPhone) so the
// right input gets highlighted.
const FIELD_MAP: Record<string, string> = {
  schoolName: "schoolName",
  name: "contactName",
  email: "contactEmail",
  phone: "contactPhone",
};
const fieldErrors = ref<Record<string, string>>({});

// Creates the account immediately (no platform-admin review) and signs the
// new admin straight in — see server/api/auth/register.post.ts.
async function onSubmit() {
  error.value = "";
  fieldErrors.value = {};
  submitting.value = true;
  try {
    await api("/auth/register", {
      method: "POST",
      body: {
        schoolName: form.value.schoolName,
        name: form.value.contactName,
        email: form.value.contactEmail,
        password: form.value.password,
        phone: form.value.contactPhone || undefined,
      },
    });
    await login(form.value.contactEmail, form.value.password);
    await navigateTo("/dashboard");
  } catch (e) {
    const fields = apiFieldErrors(e);
    if (fields) {
      fieldErrors.value = Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [FIELD_MAP[k] ?? k, v]),
      );
    } else {
      error.value = apiError(e);
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <!-- Hero -->
    <!-- `isolate` gives this section its own stacking context so the -z-10
         background below stays scoped behind this section's own content —
         without it, a bare `relative` (no z-index) doesn't create a stacking
         context, and -z-10 escapes to the page root and renders behind
         everything, including the section's own background. -->
    <section class="relative isolate overflow-hidden">
      <!-- Background photo, lightly tinted so the text stays readable everywhere -->
      <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <img :src="assemblyImg" alt="" class="size-full object-cover" />
        <div class="absolute inset-0 bg-background/70" />
        <div class="absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div class="absolute -right-24 top-40 size-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div class="absolute -left-24 top-96 size-72 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div class="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:items-center lg:py-32">
        <div>
          <Badge class="gap-1.5 px-3 py-1">
            <Sparkles class="size-3.5" /> The all-in-one school management platform
          </Badge>
          <h1 class="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
            EduCore — everything your school needs, in one place
          </h1>
          <p class="mt-5 max-w-xl text-lg text-muted-foreground">
            Manage classes, attendance, timetables and fees for your whole school — and give
            parents the real-time visibility most school systems never offer, from a child's
            first day to their final report card.
          </p>
          <ul class="mt-6 space-y-2">
            <li v-for="h in highlights" :key="h" class="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 class="size-4 shrink-0 text-success" /> {{ h }}
            </li>
          </ul>
          <div class="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" :as="'div'">
              <a href="#get-started" class="flex items-center gap-1.5">Get started <ArrowRight class="size-4" /></a>
            </Button>
            <Button size="lg" variant="outline" :as="'div'">
              <NuxtLink to="/login">Login</NuxtLink>
            </Button>
          </div>
        </div>

        <!-- Floating preview card -->
        <div class="relative mx-auto w-full max-w-sm lg:max-w-none">
          <Card class="relative rotate-1 border-2 shadow-xl">
            <CardContent class="p-5">
              <div class="flex items-center justify-between border-b pb-3">
                <p class="text-sm font-semibold">Today's overview</p>
                <Badge variant="success">Live</Badge>
              </div>
              <div class="mt-4 grid grid-cols-2 gap-3">
                <div class="rounded-lg bg-muted/60 p-3">
                  <p class="text-xs text-muted-foreground">Present today</p>
                  <p class="mt-1 text-2xl font-bold">428</p>
                </div>
                <div class="rounded-lg bg-muted/60 p-3">
                  <p class="text-xs text-muted-foreground">Pending alerts</p>
                  <p class="mt-1 text-2xl font-bold text-amber-600">3</p>
                </div>
              </div>
              <div class="mt-4 flex items-center gap-3 rounded-lg border p-3">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
                  <BellRing class="size-4" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">Zainab is marked absent</p>
                  <p class="text-xs text-muted-foreground">Sent to parent · awaiting reason</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card class="absolute -bottom-6 -left-6 hidden -rotate-3 shadow-lg sm:block">
            <CardContent class="flex items-center gap-2.5 p-3">
              <div class="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 class="size-4" />
              </div>
              <div>
                <p class="text-xs font-medium">Reason received</p>
                <p class="text-[11px] text-muted-foreground">"Hospital appointment"</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="border-t bg-muted/30 py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight">Everything a school needs to keep parents close</h2>
          <p class="mt-3 text-muted-foreground">
            One portal for admins, teachers, and the parents who want to stay in the loop.
          </p>
        </div>
        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            v-for="f in features"
            :key="f.title"
            class="group p-2 transition-shadow hover:shadow-md"
          >
            <CardContent class="pt-4">
              <div
                class="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
              >
                <component :is="f.icon" class="size-5" />
              </div>
              <h3 class="font-semibold">{{ f.title }}</h3>
              <p class="mt-1.5 text-sm text-muted-foreground">{{ f.description }}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    <!-- Gallery -->
    <section id="gallery" class="py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight">A closer look inside the classroom</h2>
          <p class="mt-3 text-muted-foreground">
            The everyday moments EduCore is built around.
          </p>
        </div>
        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <figure v-for="g in gallery" :key="g.title" class="group relative overflow-hidden rounded-2xl">
            <img
              :src="g.src"
              :alt="g.alt"
              class="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <figcaption class="absolute inset-x-0 bottom-0 p-5 text-white">
              <p class="font-semibold">{{ g.title }}</p>
              <p class="mt-1 text-sm text-white/80">{{ g.description }}</p>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- Audiences -->
    <section id="audiences" class="py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight">Built for everyone in your school community</h2>
          <p class="mt-3 text-muted-foreground">Three portals, one shared record — nobody's left guessing.</p>
        </div>
        <div class="mt-12 grid gap-6 lg:grid-cols-3">
          <Card v-for="a in audiences" :key="a.title" class="p-2">
            <CardContent class="pt-5">
              <div class="flex size-11 items-center justify-center rounded-lg" :class="a.tone">
                <component :is="a.icon" class="size-5" />
              </div>
              <h3 class="mt-4 text-lg font-semibold">{{ a.title }}</h3>
              <ul class="mt-3 space-y-2.5">
                <li v-for="p in a.points" :key="p" class="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-success" /> {{ p }}
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="how-it-works" class="border-t bg-muted/30 py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight">Get your school onboarded in three steps</h2>
        </div>
        <div class="relative mt-14 grid gap-10 sm:grid-cols-3">
          <div class="absolute left-0 right-0 top-5 hidden h-px bg-border sm:block" aria-hidden="true" />
          <div v-for="(s, i) in steps" :key="s.title" class="relative text-center">
            <div class="relative mx-auto mb-4 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
              {{ i + 1 }}
            </div>
            <h3 class="font-semibold">{{ s.title }}</h3>
            <p class="mt-1.5 text-sm text-muted-foreground">{{ s.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="py-20">
      <div class="mx-auto max-w-3xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight">Frequently asked questions</h2>
        </div>
        <div class="mt-10 space-y-3">
          <details v-for="f in faqs" :key="f.q" class="group rounded-lg border bg-card px-5 py-4">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {{ f.q }}
              <span class="shrink-0 text-muted-foreground transition-transform group-open:rotate-45">＋</span>
            </summary>
            <p class="mt-3 text-sm text-muted-foreground">{{ f.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- CTA banner -->
    <section class="border-t">
      <div class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div class="flex flex-col items-center gap-6 rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
          <Users class="size-8" />
          <h2 class="text-3xl font-bold tracking-tight dark:text-white">Ready to bring EduCore to your school?</h2>
          <p class="max-w-xl text-primary-foreground/80 dark:text-white/80">
            Create your account below and start managing your school right away — no waiting.
          </p>
          <Button size="lg" variant="secondary" :as="'div'">
            <a href="#get-started">Create account</a>
          </Button>
        </div>
      </div>
    </section>

    <!-- Signup -->
    <section id="get-started" class="bg-muted/30 py-20">
      <div class="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-start">
        <div class="lg:pt-8">
          <h2 class="text-3xl font-bold tracking-tight">Bring EduCore to your school</h2>
          <p class="mt-3 text-muted-foreground">
            Create your school's account in minutes — no waiting, no sales calls, no commitment.
          </p>
          <ul class="mt-6 space-y-3">
            <li class="flex items-start gap-2.5 text-sm">
              <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-success" />
              Instant access — no waiting for approval
            </li>
            <li class="flex items-start gap-2.5 text-sm">
              <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-success" />
              Add your own classes, students and staff right after signing in
            </li>
            <li class="flex items-start gap-2.5 text-sm">
              <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-success" />
              Free to try — no credit card required
            </li>
          </ul>
        </div>

        <Card>
          <CardContent class="pt-6">
            <form class="space-y-4" @submit.prevent="onSubmit">
              <Alert v-if="error" variant="destructive">{{ error }}</Alert>
              <div class="space-y-1.5">
                <Label for="schoolName">School name</Label>
                <Input id="schoolName" v-model="form.schoolName" required :class="fieldErrors.schoolName ? 'border-destructive' : ''" />
                <p v-if="fieldErrors.schoolName" class="text-xs text-destructive">{{ fieldErrors.schoolName }}</p>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-1.5">
                  <Label for="contactName">Your name</Label>
                  <Input id="contactName" v-model="form.contactName" required :class="fieldErrors.contactName ? 'border-destructive' : ''" />
                  <p v-if="fieldErrors.contactName" class="text-xs text-destructive">{{ fieldErrors.contactName }}</p>
                </div>
                <div class="space-y-1.5">
                  <Label for="contactPhone">Phone <span class="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id="contactPhone" v-model="form.contactPhone" :class="fieldErrors.contactPhone ? 'border-destructive' : ''" />
                  <p v-if="fieldErrors.contactPhone" class="text-xs text-destructive">{{ fieldErrors.contactPhone }}</p>
                </div>
              </div>
              <div class="space-y-1.5">
                <Label for="contactEmail">Email</Label>
                <Input id="contactEmail" v-model="form.contactEmail" type="email" required :class="fieldErrors.contactEmail ? 'border-destructive' : ''" />
                <p v-if="fieldErrors.contactEmail" class="text-xs text-destructive">{{ fieldErrors.contactEmail }}</p>
              </div>
              <div class="space-y-1.5">
                <Label for="password">Password</Label>
                <Input id="password" v-model="form.password" type="password" minlength="6" required :class="fieldErrors.password ? 'border-destructive' : ''" />
                <p v-if="fieldErrors.password" class="text-xs text-destructive">{{ fieldErrors.password }}</p>
              </div>
              <Button type="submit" class="w-full" size="lg" :loading="submitting">Create account</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  </div>
</template>
