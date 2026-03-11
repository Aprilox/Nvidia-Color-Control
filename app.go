package main

import (
	"context"
	"nvidia-color-control/display"
)

// App struct
type App struct {
	ctx   context.Context
	store *ProfileStore
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		store: NewProfileStore(),
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	display.GetHelperDir()
}

// shutdown is called when the app is closing — reset display to default
func (a *App) shutdown(ctx context.Context) {
	display.ResetToDefault()
	display.CleanupHelpers()
}

// --- Display bindings ---

// GetDisplays returns all detected displays
func (a *App) GetDisplays() ([]display.DisplayInfo, error) {
	return display.ListDisplays()
}

// --- Profile CRUD bindings ---

// GetProfiles returns all saved profiles
func (a *App) GetProfiles() ([]Profile, error) {
	return a.store.LoadProfiles()
}

// SaveProfile updates an existing profile
func (a *App) SaveProfile(profile Profile) error {
	return a.store.UpdateProfile(profile)
}

// AddProfile creates a new profile
func (a *App) AddProfile(name string, icon string) (*Profile, error) {
	return a.store.AddProfile(name, icon)
}

// DeleteProfile deletes a profile by ID
func (a *App) DeleteProfile(id string) error {
	return a.store.DeleteProfile(id)
}

// DuplicateProfile duplicates a profile
func (a *App) DuplicateProfile(id string) (*Profile, error) {
	return a.store.DuplicateProfile(id)
}

// --- Display control bindings ---

// ApplyProfile applies a profile's display settings to the specified display
func (a *App) ApplyProfile(profile Profile, displayIdx int) error {
	if profile.ID == "default" {
		return a.ResetDisplay(displayIdx)
	}

	err := display.ApplySettings(
		displayIdx,
		profile.Gamma,
		profile.Contrast/50.0,
		profile.Red,
		profile.Green,
		profile.Blue,
		profile.Brightness-50,
	)
	if err != nil {
		return err
	}

	if display.IsVibranceAvailable() {
		// UI scale from 50 (default) to 100 (max) corresponds to NVAPI 0 to 63.
		if profile.Vibrance < 50 {
			profile.Vibrance = 50
		}
		v := int(float64(profile.Vibrance-50) * 63.0 / 50.0)
		_ = display.SetVibrance(v)
	}

	return nil
}

// ResetDisplay resets a specific display to default settings
func (a *App) ResetDisplay(displayIdx int) error {
	err := display.ResetDisplay(displayIdx)
	if err != nil {
		return err
	}
	if display.IsVibranceAvailable() {
		_ = display.SetVibrance(0)
	}
	return nil
}

// IsVibranceAvailable checks if digital vibrance control is available
func (a *App) IsVibranceAvailable() bool {
	return display.IsVibranceAvailable()
}
