package display

import (
	"embed"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

//go:embed helpers/gamma.exe
var gammaExeData []byte

//go:embed helpers/vibrance.exe
var vibranceExeData []byte

var (
	helperDir  string
	helperOnce sync.Once
)

// extractHelpers writes the embedded exe files to a temp directory
func extractHelpers() {
	dir, err := os.MkdirTemp("", "nvidia-color-control-*")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to create temp dir: %v\n", err)
		return
	}
	helperDir = dir

	writeHelper("gamma.exe", gammaExeData)
	writeHelper("vibrance.exe", vibranceExeData)
}

func writeHelper(name string, data []byte) {
	path := filepath.Join(helperDir, name)
	if err := os.WriteFile(path, data, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write %s: %v\n", name, err)
	}
}

// GetHelperDir returns the directory containing the extracted helper executables
func GetHelperDir() string {
	helperOnce.Do(extractHelpers)
	return helperDir
}

// CleanupHelpers removes the temp directory with helper executables
func CleanupHelpers() {
	if helperDir != "" {
		os.RemoveAll(helperDir)
	}
}

// Ensure embed import is used
var _ embed.FS
