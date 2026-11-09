<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import RoleIcon from './RoleIcon.svelte';
	import TagInput from './TagInput.svelte';
	import {
		EXPERIENCES,
		EXPERIENCE_LABELS,
		ROLES,
		ROLE_LABELS,
		TOOL_SUGGESTIONS,
		type Experience,
		type Role
	} from '#lib/profile.ts';
	import { formatOffset, offsetMinutes, timeZoneOptions } from '#lib/tz.ts';
	import { toast } from '#lib/toast.svelte.ts';

	export type ProfileValues = {
		roles: Role[];
		tools: string[];
		experience: Experience;
		timezone: string;
		bio: string;
		contactDiscord: string | null;
		links: string[];
	};

	let {
		values,
		errors = {},
		wizard = false,
		detectTimezone = false,
		submitLabel = 'Save'
	}: {
		values: ProfileValues;
		errors?: Record<string, string>;
		wizard?: boolean;
		detectTimezone?: boolean;
		submitLabel?: string;
	} = $props();

	// Local editable copy of the initial values (the form owns its state after mount).
	// svelte-ignore state_referenced_locally
	let roles = $state<Role[]>([...values.roles]);
	// svelte-ignore state_referenced_locally
	let tools = $state<string[]>([...values.tools]);
	// svelte-ignore state_referenced_locally
	let timezone = $state(values.timezone);
	// svelte-ignore state_referenced_locally
	let links = $state<string[]>(values.links.length ? [...values.links] : ['']);
	let step = $state(0);
	let submitting = $state(false);
	// The step-by-step UI needs JS; without it the whole form is shown on one page.
	let mounted = $state(false);
	const stepped = $derived(wizard && mounted);

	const zones = timeZoneOptions();
	const steps = ['What you do', 'Your setup', 'How to reach you'];
	const offsetLabel = $derived.by(() => {
		try {
			return formatOffset(offsetMinutes(timezone));
		} catch {
			return '';
		}
	});

	onMount(() => {
		mounted = true;
		if (detectTimezone) timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
	});

	// Jump to the first step that has an error after a failed submit.
	const stepOfField: Record<string, number> = {
		roles: 0,
		experience: 0,
		tools: 1,
		timezone: 1,
		bio: 2,
		contactDiscord: 2,
		links: 2
	};
	$effect(() => {
		const first = Object.keys(errors)[0];
		if (stepped && first in stepOfField) step = stepOfField[first];
	});

	const show = (s: number) => !stepped || step === s;
	const canContinue = $derived(step !== 0 || roles.length > 0);
</script>

<form
	method="POST"
	class="space-y-8"
	use:enhance={() => {
		submitting = true;
		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'failure') toast('Please fix the highlighted fields.', 'error');
			if (result.type === 'success') toast('Profile saved.');
			await update({ reset: false, navigate: false });
		};
	}}
>
	{#if stepped}
		<ol class="flex items-center gap-2 text-xs" aria-label="Progress">
			{#each steps as label, i (label)}
				<li class="flex flex-1 flex-col gap-1.5">
					<span class="h-1 rounded-full {i <= step ? 'bg-accent' : 'bg-surface-2'}"></span>
					<span
						class={i === step ? 'text-text' : 'text-muted'}
						aria-current={i === step ? 'step' : undefined}
					>
						{i + 1}. {label}
					</span>
				</li>
			{/each}
		</ol>
	{/if}

	<!-- Step 1: roles + experience. Hidden steps stay in the DOM so all fields are submitted. -->
	<section class="space-y-6" hidden={!show(0)}>
		<fieldset>
			<legend class="label">What can you bring to a team?</legend>
			<p class="hint mb-3">Pick everything you're comfortable doing. Your main skill first.</p>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
				{#each ROLES as role (role)}
					<label class="choice w-full">
						<input type="checkbox" name="roles" value={role} bind:group={roles} class="sr-only" />
						<RoleIcon {role} size={16} />
						{ROLE_LABELS[role]}
					</label>
				{/each}
			</div>
			{#if errors.roles}<p class="field-error">{errors.roles}</p>{/if}
		</fieldset>

		<fieldset>
			<legend class="label">Game jam experience</legend>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each EXPERIENCES as exp (exp)}
					<label class="choice">
						<input
							type="radio"
							name="experience"
							value={exp}
							checked={values.experience === exp}
							class="sr-only"
						/>
						{EXPERIENCE_LABELS[exp]}
					</label>
				{/each}
			</div>
			{#if errors.experience}<p class="field-error">{errors.experience}</p>{/if}
		</fieldset>
	</section>

	<!-- Step 2: tools + timezone -->
	<section class="space-y-6" hidden={!show(1)}>
		<div>
			<span class="label">Tools & engines</span>
			<TagInput name="tools" bind:value={tools} suggestions={TOOL_SUGGESTIONS} />
			{#if errors.tools}<p class="field-error">{errors.tools}</p>{/if}
		</div>

		<div>
			<label class="label" for="timezone">Timezone</label>
			<div class="flex items-center gap-3">
				<select id="timezone" name="timezone" bind:value={timezone} class="w-full max-w-sm">
					{#each zones as z (z)}<option value={z}>{z.replaceAll('_', ' ')}</option>{/each}
				</select>
				<span class="text-sm text-muted">{offsetLabel}</span>
			</div>
			<p class="hint">Used to show how many waking hours you overlap with teammates.</p>
			{#if errors.timezone}<p class="field-error">{errors.timezone}</p>{/if}
		</div>
	</section>

	<!-- Step 3: bio + contact -->
	<section class="space-y-6" hidden={!show(2)}>
		<div>
			<label class="label" for="bio">Short bio</label>
			<textarea
				id="bio"
				name="bio"
				rows="3"
				maxlength="500"
				class="w-full"
				placeholder="Pixel artist who loves cozy games. Looking for a programmer for my first jam!"
				>{values.bio}</textarea
			>
			{#if errors.bio}<p class="field-error">{errors.bio}</p>{/if}
		</div>

		<div class="sm:max-w-sm">
			<div>
				<label class="label" for="contactDiscord">Discord username</label>
				<input
					id="contactDiscord"
					name="contactDiscord"
					class="w-full"
					autocomplete="off"
					placeholder="yourname"
					value={values.contactDiscord ?? ''}
				/>
				{#if errors.contactDiscord}<p class="field-error">{errors.contactDiscord}</p>{/if}
			</div>
		</div>
		<p class="hint -mt-4">
			Contact details are only shown to signed-in itch.io users. Your itch.io profile is always
			linked.
		</p>

		<div>
			<span class="label"
				>Portfolio links <span class="font-normal text-muted">(up to 3)</span></span
			>
			<div class="space-y-2">
				{#each links, i (i)}
					<div class="flex gap-2">
						<input
							name="links"
							type="url"
							class="w-full"
							placeholder="https://…"
							bind:value={links[i]}
							aria-label="Portfolio link {i + 1}"
						/>
						{#if links.length > 1}
							<button
								type="button"
								class="btn-ghost btn-sm"
								aria-label="Remove link"
								onclick={() => links.splice(i, 1)}>×</button
							>
						{/if}
					</div>
				{/each}
				{#if links.length < 3}
					<button
						type="button"
						class="text-sm text-accent hover:underline"
						onclick={() => links.push('')}>+ Add link</button
					>
				{/if}
			</div>
			{#if errors.links}<p class="field-error">{errors.links}</p>{/if}
		</div>
	</section>

	<div class="flex items-center justify-between gap-3 border-t border-border pt-6">
		{#if stepped && step > 0}
			<button type="button" class="btn-ghost" onclick={() => step--}>Back</button>
		{:else}
			<span></span>
		{/if}
		{#if stepped && step < steps.length - 1}
			<button type="button" class="btn-primary" disabled={!canContinue} onclick={() => step++}
				>Continue</button
			>
		{:else}
			<button class="btn-primary" disabled={submitting}
				>{submitting ? 'Saving…' : submitLabel}</button
			>
		{/if}
	</div>
</form>
