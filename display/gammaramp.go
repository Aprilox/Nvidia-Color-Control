package display

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
)

// DisplayInfo represents a detected display
type DisplayInfo struct {
	Index int    `json:"index"`
	Name  string `json:"name"`
}

// hideWindow returns SysProcAttr that hides the console window
func hideWindow() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{HideWindow: true}
}

// ListDisplays returns all attached displays with friendly names
func ListDisplays() ([]DisplayInfo, error) {
	exePath := filepath.Join(GetHelperDir(), "gamma.exe")

	cmd := exec.Command(exePath, "list")
	cmd.SysProcAttr = hideWindow()
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("gamma.exe list failed: %v", err)
	}

	var displays []DisplayInfo
	for _, line := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		idx, _ := strconv.Atoi(parts[0])
		displays = append(displays, DisplayInfo{
			Index: idx,
			Name:  strings.TrimSpace(parts[1]),
		})
	}
	return displays, nil
}

// ApplySettings calls gamma.exe with the given parameters for a specific display
func ApplySettings(displayIdx int, gamma, contrast, red, green, blue float64, brightness int) error {
	exePath := filepath.Join(GetHelperDir(), "gamma.exe")

	cmd := exec.Command(exePath,
		strconv.Itoa(displayIdx),
		formatFloat(gamma),
		strconv.Itoa(brightness),
		formatFloat(contrast),
		formatFloat(red),
		formatFloat(green),
		formatFloat(blue),
	)
	cmd.SysProcAttr = hideWindow()
	output, err := cmd.CombinedOutput()
	out := strings.TrimSpace(string(output))
	if err != nil {
		return fmt.Errorf("gamma.exe failed: %v — %s", err, out)
	}
	if !strings.Contains(out, "OK") {
		return fmt.Errorf("gamma.exe: %s", out)
	}
	return nil
}

// ResetToDefault resets all displays
func ResetToDefault() error {
	exePath := filepath.Join(GetHelperDir(), "gamma.exe")

	cmd := exec.Command(exePath, "all", "reset")
	cmd.SysProcAttr = hideWindow()
	output, err := cmd.CombinedOutput()
	out := strings.TrimSpace(string(output))
	if err != nil {
		return fmt.Errorf("gamma.exe reset failed: %v — %s", err, out)
	}
	return nil
}

// ResetDisplay resets a specific display by index
func ResetDisplay(displayIdx int) error {
	exePath := filepath.Join(GetHelperDir(), "gamma.exe")

	cmd := exec.Command(exePath, strconv.Itoa(displayIdx), "reset")
	cmd.SysProcAttr = hideWindow()
	output, err := cmd.CombinedOutput()
	out := strings.TrimSpace(string(output))
	if err != nil {
		return fmt.Errorf("gamma.exe reset failed: %v — %s", err, out)
	}
	return nil
}

func formatFloat(v float64) string {
	return strconv.FormatFloat(v, 'f', 4, 64)
}
