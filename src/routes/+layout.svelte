<script lang="ts">
	import '@fontsource/oxanium/500.css';
	import '@fontsource/oxanium/600.css';
	import '@fontsource/oxanium/700.css';
	import '@fontsource/barlow/400.css';
	import '@fontsource/barlow/500.css';
	import '@fontsource/barlow/600.css';
	import '#lib/ui/theme.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Level Up · Kalabrien</title>
</svelte:head>

{@render children()}
