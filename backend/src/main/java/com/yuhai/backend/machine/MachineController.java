package com.yuhai.backend.machine;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/machines")
public class MachineController {

    private final MachineService machineService;

    public MachineController(MachineService machineService) {
        this.machineService = machineService;
    }

    @PostMapping
    public ResponseEntity<MachineResponse> create(@Valid @RequestBody MachineCreateRequest request) {
        MachineResponse created = machineService.create(request);
        return ResponseEntity.created(URI.create("/api/machines/" + created.id())).body(created);
    }

    @GetMapping
    public List<MachineResponse> list() {
        return machineService.list();
    }
}
