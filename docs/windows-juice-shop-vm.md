# Windows VM Setup for OWASP Juice Shop Lab

This guide provides a high-level process for creating a Windows 11 virtual machine (VM) that hosts the OWASP Juice Shop training application. The goal is to keep the VM isolated from the public internet while still allowing a local attack workstation (for example, a Kali Linux VM) to access the application over a private network.

> **Disclaimer:** OWASP Juice Shop is intentionally vulnerable and should be operated only in controlled lab environments. Follow your organization’s policies for software licensing, patching, and security monitoring.

## 1. Prepare Your Virtualization Environment

1. **Choose a hypervisor** that supports Windows 11 and snapshotting (e.g., Proxmox VE, VMware Workstation/ESXi, VirtualBox, or Hyper-V).
2. **Verify hardware requirements** for Windows 11 (TPM 2.0, secure boot). Many hypervisors provide virtual TPM/secure boot options.
3. **Create an isolated virtual switch/network** that does not bridge to the external NIC. This prevents the VM from reaching the public internet by default.
4. **Plan storage and CPU/RAM allocation** (at least 4 vCPUs, 8 GB RAM, and 60 GB disk recommended for comfortable usage).

## 2. Obtain Installation Media

1. Download the official Windows 11 ISO from Microsoft and verify its checksum.
2. Download the latest [OWASP Juice Shop release](https://owasp.org/www-project-juice-shop/). The easiest offline deployment option is the Node.js packaged distribution or the Docker image, both of which you can transfer via ISO, USB passthrough, or a shared folder that is not connected to the internet.
3. Collect any supporting tools you need (e.g., Node.js offline installers, Docker Desktop installer, or PowerShell scripts) and stage them in a secure offline storage location.

## 3. Install Windows 11

1. Create a new VM with the Windows 11 ISO attached.
2. Configure the VM to use the internal-only virtual switch and **do not define a default gateway or DNS server** on the Windows network adapter during setup.
3. Complete the installation and activate Windows using a valid license.
4. Apply the latest cumulative updates by temporarily attaching the VM to a trusted update source or by using offline-servicing packages. After updates, revert the adapter to the isolated network.
5. Create an administrator account dedicated to lab maintenance and a standard account for daily use or demonstrations.

## 4. Harden the Baseline Snapshot

1. Disable or remove any services you do not need (e.g., OneDrive sync, consumer apps) to reduce noise.
2. Enable host-based firewall rules that only allow inbound traffic on the port you will use for Juice Shop (default: TCP 3000). Keep RDP disabled unless you require remote administration.
3. Install endpoint protection or logging tools if you want visibility into lab activity.
4. Take a **clean snapshot** once the baseline OS configuration is complete. This is your rollback point before introducing the vulnerable application.

## 5. Install OWASP Juice Shop

You can deploy Juice Shop natively with Node.js or via Docker. The native option avoids running a container engine on Windows and works well offline.

### Option A: Native Node.js Installation

1. Install the Node.js LTS offline installer.
2. Copy the Juice Shop packaged distribution (`juice-shop-<version>.zip`) into the VM.
3. Extract the archive and open **Windows Terminal** or **PowerShell** in the extracted directory.
4. Run `npm install --only=prod` to install dependencies.
5. Launch the app with `npm start`. By default it listens on `http://127.0.0.1:3000`.

### Option B: Docker Deployment

1. Install Docker Desktop (can be done offline with the installer file).
2. Load the Juice Shop Docker image using `docker load -i juice-shop.tar` if you exported it from another machine.
3. Run the container with `docker run -d -p 3000:3000 --name juice-shop bkimminich/juice-shop`.

## 6. Expose Juice Shop to Your Internal Lab Network

1. Modify the Windows Firewall inbound rule to allow TCP 3000 from your internal lab subnet.
2. Assign a static IP address in the isolated network (e.g., `192.168.56.10`) **without a gateway or DNS**.
3. Verify from the attack VM (e.g., Kali) that you can browse to `http://192.168.56.10:3000`.

## 7. Ongoing Maintenance and Safety

1. **Snapshots:** Take another snapshot after Juice Shop is installed. Revert to this state between exercises to clear user data.
2. **No internet egress:** Confirm via `tracert` and firewall monitoring that the Windows VM cannot reach external hosts. Optionally, add a host-only firewall rule blocking outbound traffic except to the internal subnet.
3. **Logging:** Enable Windows Event Forwarding or third-party logging to track activity. Store logs on a separate management VM if you need persistent records.
4. **Update cadence:** Periodically refresh Juice Shop by importing a new offline package, applying it to a cloned VM, and validating functionality before replacing the active snapshot.
5. **Credential hygiene:** Use unique credentials for each user and rotate them regularly, especially if the VM is exposed through a remote desktop gateway.

Following these steps yields a Windows VM hosting OWASP Juice Shop that is accessible only within your lab network. Pair it with a separate Kali Linux VM on the same isolated switch to replicate offensive/defensive training scenarios without touching the public internet.
