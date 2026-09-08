package com.hadkarmeals.service;

import com.hadkarmeals.entity.Hostel;
import com.hadkarmeals.exception.BusinessException;
import com.hadkarmeals.repository.HostelRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class HostelService {

    private final HostelRepository hostelRepository;

    public HostelService(HostelRepository hostelRepository) {
        this.hostelRepository = hostelRepository;
    }

    public List<Hostel> getAllHostels() {
        return hostelRepository.findAll();
    }

    @Transactional
    public Hostel createHostel(String name, String address) {
        if (hostelRepository.findByName(name).isPresent()) {
            throw new BusinessException("Service location with name '" + name + "' already exists");
        }
        Hostel hostel = Hostel.builder()
                .name(name)
                .address(address)
                .active(true)
                .build();
        return hostelRepository.save(hostel);
    }

    @Transactional
    public Hostel updateHostel(Long id, String name, String address) {
        Hostel hostel = hostelRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Service location not found with id: " + id));
        hostel.setName(name);
        if (address != null) {
            hostel.setAddress(address);
        }
        return hostelRepository.save(hostel);
    }

    @Transactional
    public Hostel toggleHostel(Long id) {
        Hostel hostel = hostelRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Service location not found with id: " + id));
        hostel.setActive(!Boolean.TRUE.equals(hostel.getActive()));
        return hostelRepository.save(hostel);
    }

    @Transactional
    public void deleteHostel(Long id) {
        Hostel hostel = hostelRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Service location not found with id: " + id));
        hostelRepository.delete(hostel);
    }
}
