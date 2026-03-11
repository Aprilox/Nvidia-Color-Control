package display

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
)

// IsVibranceAvailable checks if digital vibrance control is available
func IsVibranceAvailable() bool {
	dir := GetHelperDir()
	return dir != ""
}

// SetVibrance sets the digital vibrance level (0-100)
func SetVibrance(level int) error {
	exePath := filepath.Join(GetHelperDir(), "vibrance.exe")

	if level < 0 {
		level = 0
	}
	if level > 100 {
		level = 100
	}

	cmd := exec.Command(exePath, strconv.Itoa(level))
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	output, err := cmd.CombinedOutput()
	out := strings.TrimSpace(string(output))
	if err != nil {
		return fmt.Errorf("vibrance.exe failed: %v — %s", err, out)
	}
	return nil
}

// GetVibrancePercent returns a default value
func GetVibrancePercent() (int, error) {
	return 50, nil
}
