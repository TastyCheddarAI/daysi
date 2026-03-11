# Asset Onboarding Spec

## Purpose

This is the intake path for `Daysi` brand assets, product imagery, and before-and-after media.

The goal is to keep assets usable, traceable, and legally safe without polluting the codebase with random binaries and mystery filenames.

## Intake Rules

- brand assets and small curated marketing assets can be versioned with the app
- large raw photography and before-and-after image sets should not live in git long-term
- every image intended for public use must have usage rights tracked in a manifest
- every before-and-after image must carry consent metadata before it is used anywhere public
- filenames must never contain patient names, email addresses, phone numbers, or other direct identifiers

## What To Provide

### Brand Assets

Preferred:

- logo in `SVG`
- logo in transparent `PNG`
- icon mark in `SVG`
- favicon source in `SVG` or high-res `PNG`
- any lockup variants
- brand colors and font choices if available

### Marketing Images

Preferred:

- original high-resolution `JPG`, `PNG`, or `WEBP`
- one clear intended use per asset
  hero, service page, education page, ads, social, etc
- rights status for each image

### Before-And-After Images

Preferred:

- original full-resolution files
- one pair ID per before-and-after set
- no personal names in filenames
- consent scope
  internal only, education only, marketing approved, or all approved
- treatment or service represented
- capture dates if known

## Folder Structure

Use this workspace structure:

- `assets/intake/brand/`
  drop raw logo and brand files here
- `assets/intake/marketing/`
  drop raw marketing imagery here
- `assets/intake/before-after/`
  drop raw before-and-after image sets here
- `assets/manifests/brand-assets-template.csv`
  metadata template for logos and marketing assets
- `assets/manifests/clinical-media-template.csv`
  metadata template for before-and-after and future clinical imagery

## Naming Rules

Use lowercase kebab-case filenames.

Examples:

- `daysi-primary-logo.svg`
- `daysi-icon-mark.png`
- `laser-hair-removal-hero-01.webp`
- `ba-pair-0001-before.jpg`
- `ba-pair-0001-after.jpg`

Do not use:

- spaces
- dates in random formats
- names of patients or staff
- filenames like `final-final-3.jpg`

## Required Metadata

### Brand And Marketing Assets

Track:

- asset ID
- filename
- asset type
- intended use
- rights status
- source
- notes

### Before-And-After Assets

Track:

- asset ID
- pair ID
- filename
- stage
  before or after
- treatment or service
- location if relevant
- consent scope
- public-use approval
- capture date if known
- source system or uploader
- notes

## Privacy And Compliance Rules

- do not store direct personal identifiers in filenames or manifests
- use internal subject or pair IDs only
- public marketing usage must be explicitly approved
- if consent status is unknown, treat the image as non-public
- if an image includes sensitive identifying context, flag it for restricted handling

## Repo Versus Storage Rule

Short version:

- logos and selected productized web assets can live with the codebase
- raw media libraries should be staged locally, then ingested into S3 later

This keeps the repo sane and avoids turning git into a photo archive.

## Best In Class Intake Workflow

1. Drop raw files into the correct `assets/intake/...` folder.
2. Fill in the matching manifest template.
3. I review the set for naming, missing metadata, and obvious rights problems.
4. We promote approved brand assets into app-managed directories.
5. We leave raw media as staged intake until the S3 media pipeline is ready.
6. Before-and-after media only becomes public-facing after consent scope is verified.

## What I Want From You

For the first pass, give me:

- the logo files
- any icon variants
- a small first batch of approved marketing images
- a small first batch of before-and-after pairs
- whatever usage and consent info you already have

If metadata is incomplete, that is fine. I would rather get the files and mark gaps than pretend the gaps do not exist.
