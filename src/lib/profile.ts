// Shared (client + server) profile vocabulary.

export const ROLES = ['code', 'art', 'audio', 'design', 'writing', 'qa', 'producer'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
	code: 'Programming',
	art: 'Art',
	audio: 'Audio',
	design: 'Game design',
	writing: 'Writing',
	qa: 'Testing / QA',
	producer: 'Producer'
};

export const EXPERIENCES = ['first_jam', 'some', 'veteran'] as const;
export type Experience = (typeof EXPERIENCES)[number];

export const EXPERIENCE_LABELS: Record<Experience, string> = {
	first_jam: 'First jam',
	some: 'A few jams',
	veteran: 'Jam veteran'
};

export const TOOL_SUGGESTIONS = [
	'Godot',
	'Unity',
	'Unreal',
	'GameMaker',
	'Bevy',
	'Love2D',
	'PICO-8',
	'Phaser',
	'Construct',
	'RPG Maker',
	'Twine',
	'Blender',
	'Aseprite',
	'Krita',
	'Photoshop',
	'FL Studio',
	'Ableton',
	'Reaper',
	'FMOD'
];
