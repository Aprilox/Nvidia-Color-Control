package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

// Profile represents a display configuration preset
type Profile struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Icon       string  `json:"icon"`
	Gamma      float64 `json:"gamma"`
	Brightness int     `json:"brightness"`
	Contrast   float64 `json:"contrast"`
	Vibrance   int     `json:"vibrance"`
	Red        float64 `json:"red"`
	Green      float64 `json:"green"`
	Blue       float64 `json:"blue"`
	CreatedAt  string  `json:"createdAt"`
}

// ProfileStore manages the persistence of profiles
type ProfileStore struct {
	filePath string
}

// NewProfileStore creates a new profile store
func NewProfileStore() *ProfileStore {
	appData := os.Getenv("APPDATA")
	if appData == "" {
		appData = "."
	}
	dir := filepath.Join(appData, "NvidiaColorControl")
	os.MkdirAll(dir, 0755)

	return &ProfileStore{
		filePath: filepath.Join(dir, "profiles.json"),
	}
}

// DefaultProfile returns the factory defaults
func DefaultProfile() Profile {
	return Profile{
		ID:         "default",
		Name:       "Default",
		Icon:       "🖥️",
		Gamma:      1.00,
		Brightness: 50,
		Contrast:   50.0,
		Vibrance:   50,
		Red:        1.0,
		Green:      1.0,
		Blue:       1.0,
		CreatedAt:  time.Now().Format(time.RFC3339),
	}
}

// LoadProfiles loads all profiles from disk
func (ps *ProfileStore) LoadProfiles() ([]Profile, error) {
	data, err := os.ReadFile(ps.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			// Return default profiles
			defaults := []Profile{
				DefaultProfile(),
				{
					ID: "gaming", Name: "Gaming", Icon: "🎮",
					Gamma: 1.10, Brightness: 60, Contrast: 55.0, Vibrance: 80,
					Red: 1.0, Green: 1.0, Blue: 1.0,
					CreatedAt: time.Now().Format(time.RFC3339),
				},
				{
					ID: "cinema", Name: "Cinéma", Icon: "🎬",
					Gamma: 0.90, Brightness: 45, Contrast: 47.5, Vibrance: 65,
					Red: 1.0, Green: 0.95, Blue: 1.05,
					CreatedAt: time.Now().Format(time.RFC3339),
				},
				{
					ID: "night", Name: "Nuit", Icon: "🌙",
					Gamma: 1.30, Brightness: 42, Contrast: 42.5, Vibrance: 30,
					Red: 0.85, Green: 0.90, Blue: 1.10,
					CreatedAt: time.Now().Format(time.RFC3339),
				},
				{
					ID: "photo", Name: "Photo", Icon: "📷",
					Gamma: 1.0, Brightness: 50, Contrast: 50.0, Vibrance: 55,
					Red: 1.0, Green: 1.0, Blue: 1.0,
					CreatedAt: time.Now().Format(time.RFC3339),
				},
			}
			ps.SaveProfiles(defaults)
			return defaults, nil
		}
		return nil, fmt.Errorf("failed to read profiles: %w", err)
	}

	var profiles []Profile
	if err := json.Unmarshal(data, &profiles); err != nil {
		return nil, fmt.Errorf("failed to parse profiles: %w", err)
	}

	// Ensure the "default" profile remains static regardless of stored values
	hasDefault := false
	for i := range profiles {
		if profiles[i].ID == "default" {
			profiles[i] = DefaultProfile()
			hasDefault = true
			break
		}
	}
	if !hasDefault {
		profiles = append([]Profile{DefaultProfile()}, profiles...)
	}

	return profiles, nil
}

// SaveProfiles saves all profiles to disk
func (ps *ProfileStore) SaveProfiles(profiles []Profile) error {
	data, err := json.MarshalIndent(profiles, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal profiles: %w", err)
	}
	return os.WriteFile(ps.filePath, data, 0644)
}

// AddProfile creates a new profile and saves it
func (ps *ProfileStore) AddProfile(name, icon string) (*Profile, error) {
	profiles, err := ps.LoadProfiles()
	if err != nil {
		return nil, err
	}

	p := Profile{
		ID:         uuid.New().String()[:8],
		Name:       name,
		Icon:       icon,
		Gamma:      1.0,
		Brightness: 50,
		Contrast:   50.0,
		Vibrance:   50,
		Red:        1.0,
		Green:      1.0,
		Blue:       1.0,
		CreatedAt:  time.Now().Format(time.RFC3339),
	}

	profiles = append(profiles, p)
	if err := ps.SaveProfiles(profiles); err != nil {
		return nil, err
	}
	return &p, nil
}

// UpdateProfile updates an existing profile
func (ps *ProfileStore) UpdateProfile(updated Profile) error {
	profiles, err := ps.LoadProfiles()
	if err != nil {
		return err
	}

	for i, p := range profiles {
		if p.ID == updated.ID {
			profiles[i] = updated
			return ps.SaveProfiles(profiles)
		}
	}
	return fmt.Errorf("profile %s not found", updated.ID)
}

// DeleteProfile deletes a profile by ID
func (ps *ProfileStore) DeleteProfile(id string) error {
	profiles, err := ps.LoadProfiles()
	if err != nil {
		return err
	}

	filtered := make([]Profile, 0, len(profiles))
	for _, p := range profiles {
		if p.ID != id {
			filtered = append(filtered, p)
		}
	}

	if len(filtered) == len(profiles) {
		return fmt.Errorf("profile %s not found", id)
	}

	return ps.SaveProfiles(filtered)
}

// DuplicateProfile duplicates a profile with a new name
func (ps *ProfileStore) DuplicateProfile(id string) (*Profile, error) {
	profiles, err := ps.LoadProfiles()
	if err != nil {
		return nil, err
	}

	for _, p := range profiles {
		if p.ID == id {
			newP := p
			newP.ID = uuid.New().String()[:8]
			newP.Name = p.Name + " (copie)"
			newP.CreatedAt = time.Now().Format(time.RFC3339)
			profiles = append(profiles, newP)
			if err := ps.SaveProfiles(profiles); err != nil {
				return nil, err
			}
			return &newP, nil
		}
	}
	return nil, fmt.Errorf("profile %s not found", id)
}
